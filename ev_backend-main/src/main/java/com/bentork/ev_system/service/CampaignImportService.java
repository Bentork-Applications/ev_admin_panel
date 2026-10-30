package com.bentork.ev_system.service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.bentork.ev_system.dto.request.CampaignImportConfirmDTO;
import com.bentork.ev_system.dto.response.CampaignImportPreviewResponse;
import com.bentork.ev_system.dto.response.CampaignImportPreviewResponse.RowPreview;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.LeadSource;
import com.bentork.ev_system.enums.LeadStatus;
import com.bentork.ev_system.enums.MembershipStatus;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.ContactSuppressionRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.util.PhoneNormalizationUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for previewing and importing Excel/CSV contact files into a WhatsApp campaign.
 * Implements FR-03, FR-04, FR-05, FR-06, FR-07, BR-01, BR-02, BR-11, Section 10.1.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignImportService {

    private final CampaignRepository campaignRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final LeadRepository leadRepository;
    private final AdminRepository adminRepository;
    private final DuplicateMatchingService matchingService;
    private final ContactSuppressionRepository suppressionRepository;
    private final CampaignAuditService auditService;

    private static final AtomicInteger LEAD_SEQ = new AtomicInteger(100);

    /**
     * Parses an uploaded Excel or CSV file and provides a validation preview before import (FR-04).
     */
    @Transactional(readOnly = true)
    public CampaignImportPreviewResponse previewImport(Long campaignId, MultipartFile file) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<CampaignImportConfirmDTO.RowData> parsedRows = new ArrayList<>();

        try {
            if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                parsedRows = parseExcel(file.getInputStream());
            } else if (filename.endsWith(".csv") || filename.endsWith(".txt")) {
                parsedRows = parseCsv(file.getInputStream());
            } else {
                throw new IllegalArgumentException("Unsupported file format. Please upload .xlsx, .xls, or .csv");
            }
        } catch (Exception e) {
            log.error("Failed to parse file for campaign {}: {}", campaignId, e.getMessage());
            throw new IllegalArgumentException("Failed to read import file: " + e.getMessage(), e);
        }

        List<RowPreview> previews = new ArrayList<>();
        List<String> errorsSummary = new ArrayList<>();

        int validRows = 0;
        int invalidRows = 0;
        int newLeadsCount = 0;
        int matchedLeadsCount = 0;
        int alreadyInCampaignCount = 0;
        int optedOutCount = 0;

        for (int i = 0; i < parsedRows.size(); i++) {
            CampaignImportConfirmDTO.RowData row = parsedRows.get(i);
            int rowNumber = i + 1;

            RowPreview preview = new RowPreview();
            preview.setRowNumber(rowNumber);
            preview.setName(row.getName());
            preview.setRawPhone(row.getPhone());
            preview.setEmail(row.getEmail());
            preview.setCompany(row.getCompany());

            // 1. Validate required fields (name, phone)
            if (row.getName() == null || row.getName().trim().isEmpty()) {
                preview.setValid(false);
                preview.setValidationError("Contact name is required");
                invalidRows++;
                previews.add(preview);
                continue;
            }

            if (row.getPhone() == null || row.getPhone().trim().isEmpty()) {
                preview.setValid(false);
                preview.setValidationError("Phone number is required");
                invalidRows++;
                previews.add(preview);
                continue;
            }

            // 2. Normalize and validate phone
            String normalizedPhone = PhoneNormalizationUtil.normalize(row.getPhone());
            preview.setNormalizedPhone(normalizedPhone);

            if (!PhoneNormalizationUtil.isValid(normalizedPhone)) {
                preview.setValid(false);
                preview.setValidationError("Invalid phone number format: " + row.getPhone());
                invalidRows++;
                previews.add(preview);
                continue;
            }

            // 3. Check suppression
            if (suppressionRepository.existsByPhone(normalizedPhone)) {
                preview.setOptedOut(true);
                optedOutCount++;
            }

            // 4. Duplicate matching against existing CRM leads (FR-05)
            DuplicateMatchingService.MatchResult match = matchingService.matchByPhone(normalizedPhone);
            if (match.isMatched() && match.getMatchedLead() != null) {
                Lead matchedLead = match.getMatchedLead();
                preview.setAlreadyExistsInCrm(true);
                preview.setMatchedLeadId(matchedLead.getId());
                preview.setMatchedLeadNumber(matchedLead.getLeadNumber());
                matchedLeadsCount++;

                // Check if already in this campaign
                if (membershipRepository.existsByCampaignIdAndLeadId(campaignId, matchedLead.getId())) {
                    preview.setAlreadyInCampaign(true);
                    alreadyInCampaignCount++;
                }

                if (matchedLead.isOptedOut()) {
                    preview.setOptedOut(true);
                }
            } else {
                preview.setAlreadyExistsInCrm(false);
                newLeadsCount++;
            }

            preview.setValid(true);
            validRows++;
            previews.add(preview);
        }

        return CampaignImportPreviewResponse.builder()
                .totalRows(parsedRows.size())
                .validRows(validRows)
                .invalidRows(invalidRows)
                .newLeadsCount(newLeadsCount)
                .matchedLeadsCount(matchedLeadsCount)
                .alreadyInCampaignCount(alreadyInCampaignCount)
                .optedOutCount(optedOutCount)
                .rows(previews)
                .errorSummary(errorsSummary)
                .build();
    }

    /**
     * Executes the final confirmed import of contacts into the CRM and links them to the Campaign (FR-06, FR-07).
     */
    @Transactional
    public List<CampaignMembership> confirmImport(Long campaignId, CampaignImportConfirmDTO dto, String adminEmail) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        Admin defaultOwner = null;
        if (dto.getDefaultOwnerAdminId() != null) {
            defaultOwner = adminRepository.findById(dto.getDefaultOwnerAdminId()).orElse(null);
        }
        if (defaultOwner == null) {
            defaultOwner = campaign.getOwnerAdmin();
        }

        List<CampaignMembership> createdMemberships = new ArrayList<>();
        int newLeadsCreated = 0;
        int existingLeadsLinked = 0;

        for (CampaignImportConfirmDTO.RowData row : dto.getRows()) {
            if (row.getName() == null || row.getPhone() == null) continue;

            String normalizedPhone = PhoneNormalizationUtil.normalize(row.getPhone());
            if (!PhoneNormalizationUtil.isValid(normalizedPhone)) continue;

            // 1. Check duplicate matching (FR-05)
            DuplicateMatchingService.MatchResult match = matchingService.matchByPhone(normalizedPhone);
            Lead targetLead;

            if (match.isMatched() && match.getMatchedLead() != null) {
                // Link to existing lead without overwriting existing data (FR-07)
                targetLead = match.getMatchedLead();
                existingLeadsLinked++;
            } else {
                // Create new canonical CRM Lead (BR-01, FR-06)
                targetLead = new Lead();
                targetLead.setLeadNumber(generateLeadNumber());
                targetLead.setTitle(row.getName() + " - " + campaign.getName());
                targetLead.setSource(LeadSource.WHATSAPP_CAMPAIGN.getValue());
                targetLead.setStatus(LeadStatus.NEW.getValue());
                targetLead.setPhone(normalizedPhone);
                targetLead.setEmail(row.getEmail());
                targetLead.setCity(row.getCity());
                targetLead.setState(row.getState());
                targetLead.setEstimatedValue(row.getEstimatedValue());
                targetLead.setNotes("Imported via campaign: " + campaign.getName()
                        + (row.getNotes() != null ? "\n" + row.getNotes() : ""));
                targetLead.setCampaignSource(campaign.getName());
                targetLead.setOwnerAdmin(defaultOwner);
                targetLead = leadRepository.save(targetLead);
                newLeadsCreated++;
            }

            // 2. Prevent duplicate membership in this campaign (BR-02)
            if (membershipRepository.existsByCampaignIdAndLeadId(campaignId, targetLead.getId())) {
                continue;
            }

            // 3. Create Campaign Membership record
            CampaignMembership membership = new CampaignMembership();
            membership.setCampaign(campaign);
            membership.setLead(targetLead);
            membership.setOwnerAdmin(defaultOwner);
            membership.setContactName(row.getName());
            membership.setPhone(normalizedPhone);
            membership.setEligibilityStatus(targetLead.isOptedOut() ? MembershipStatus.OPTED_OUT.getValue() : MembershipStatus.ELIGIBLE.getValue());
            membership.setCurrentRound(0);

            CampaignMembership saved = membershipRepository.save(membership);
            createdMemberships.add(saved);
        }

        // Update campaign total recipients
        campaign.setTotalRecipients(campaign.getTotalRecipients() + createdMemberships.size());
        campaignRepository.save(campaign);

        auditService.logCampaign(campaignId, CampaignAuditAction.LEADS_IMPORTED.getValue(),
                String.format("Imported %d contacts (%d new leads, %d existing matched)",
                        createdMemberships.size(), newLeadsCreated, existingLeadsLinked), adminEmail);

        log.info("Campaign '{}' import completed by {}: {} total, {} new leads, {} existing linked",
                campaign.getName(), adminEmail, createdMemberships.size(), newLeadsCreated, existingLeadsLinked);

        return createdMemberships;
    }

    private List<CampaignImportConfirmDTO.RowData> parseExcel(InputStream is) throws Exception {
        List<CampaignImportConfirmDTO.RowData> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return rows;

            // Map header names to column indexes
            int nameCol = -1, phoneCol = -1, emailCol = -1, companyCol = -1, cityCol = -1, stateCol = -1, notesCol = -1;

            for (Cell cell : headerRow) {
                String val = getCellValue(cell).toLowerCase().trim();
                if (val.contains("name")) nameCol = cell.getColumnIndex();
                else if (val.contains("phone") || val.contains("mobile") || val.contains("contact")) phoneCol = cell.getColumnIndex();
                else if (val.contains("email")) emailCol = cell.getColumnIndex();
                else if (val.contains("company") || val.contains("org")) companyCol = cell.getColumnIndex();
                else if (val.contains("city")) cityCol = cell.getColumnIndex();
                else if (val.contains("state")) stateCol = cell.getColumnIndex();
                else if (val.contains("note") || val.contains("remark")) notesCol = cell.getColumnIndex();
            }

            // Defaults if not found by name
            if (nameCol == -1) nameCol = 0;
            if (phoneCol == -1) phoneCol = 1;

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String name = nameCol >= 0 ? getCellValue(row.getCell(nameCol)) : "";
                String phone = phoneCol >= 0 ? getCellValue(row.getCell(phoneCol)) : "";
                if (name.isEmpty() && phone.isEmpty()) continue;

                CampaignImportConfirmDTO.RowData rowData = new CampaignImportConfirmDTO.RowData();
                rowData.setName(name);
                rowData.setPhone(phone);
                if (emailCol >= 0) rowData.setEmail(getCellValue(row.getCell(emailCol)));
                if (companyCol >= 0) rowData.setCompany(getCellValue(row.getCell(companyCol)));
                if (cityCol >= 0) rowData.setCity(getCellValue(row.getCell(cityCol)));
                if (stateCol >= 0) rowData.setState(getCellValue(row.getCell(stateCol)));
                if (notesCol >= 0) rowData.setNotes(getCellValue(row.getCell(notesCol)));

                rows.add(rowData);
            }
        }
        return rows;
    }

    private List<CampaignImportConfirmDTO.RowData> parseCsv(InputStream is) throws Exception {
        List<CampaignImportConfirmDTO.RowData> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            if (line == null) return rows;

            String[] headers = line.split(",");
            int nameCol = -1, phoneCol = -1, emailCol = -1, companyCol = -1, cityCol = -1, stateCol = -1;

            for (int i = 0; i < headers.length; i++) {
                String val = headers[i].toLowerCase().trim().replace("\"", "");
                if (val.contains("name")) nameCol = i;
                else if (val.contains("phone") || val.contains("mobile")) phoneCol = i;
                else if (val.contains("email")) emailCol = i;
                else if (val.contains("company")) companyCol = i;
                else if (val.contains("city")) cityCol = i;
                else if (val.contains("state")) stateCol = i;
            }

            if (nameCol == -1) nameCol = 0;
            if (phoneCol == -1) phoneCol = 1;

            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"); // handle quotes

                String name = nameCol < parts.length ? parts[nameCol].replace("\"", "").trim() : "";
                String phone = phoneCol < parts.length ? parts[phoneCol].replace("\"", "").trim() : "";
                if (name.isEmpty() && phone.isEmpty()) continue;

                CampaignImportConfirmDTO.RowData rowData = new CampaignImportConfirmDTO.RowData();
                rowData.setName(name);
                rowData.setPhone(phone);
                if (emailCol >= 0 && emailCol < parts.length) rowData.setEmail(parts[emailCol].replace("\"", "").trim());
                if (companyCol >= 0 && companyCol < parts.length) rowData.setCompany(parts[companyCol].replace("\"", "").trim());
                if (cityCol >= 0 && cityCol < parts.length) rowData.setCity(parts[cityCol].replace("\"", "").trim());
                if (stateCol >= 0 && stateCol < parts.length) rowData.setState(parts[stateCol].replace("\"", "").trim());

                rows.add(rowData);
            }
        }
        return rows;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) {
            return cell.getStringCellValue().trim();
        } else if (cell.getCellType() == CellType.NUMERIC) {
            long val = (long) cell.getNumericCellValue();
            return String.valueOf(val);
        } else if (cell.getCellType() == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        return "";
    }

    private String generateLeadNumber() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return "LD-" + datePart + "-" + String.format("%04d", LEAD_SEQ.incrementAndGet());
    }
}
