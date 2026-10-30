package com.bentork.ev_system.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.bentork.ev_system.dto.request.CombinedCallLeadDTO;
import com.bentork.ev_system.dto.request.CreateLeadDTO;
import com.bentork.ev_system.dto.response.BulkOperationResponse;
import com.bentork.ev_system.dto.response.CsvImportResponse;
import com.bentork.ev_system.dto.response.LeadResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.enums.LeadStatus;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadRepository leadRepository;
    private final SalesCompanyRepository companyRepository;
    private final SalesContactRepository contactRepository;
    private final ActivityRepository activityRepository;
    private final AdminRepository adminRepository;

    // ==================== STANDARD LEAD CRUD ====================

    @Transactional
    public LeadResponse createLead(CreateLeadDTO dto, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        Lead lead = new Lead();
        lead.setLeadNumber(generateLeadNumber());
        lead.setTitle(dto.getTitle());
        lead.setSource(dto.getSource());
        lead.setStatus(LeadStatus.NEW.getValue());
        lead.setOwnerAdmin(owner);
        lead.setCity(dto.getCity());
        lead.setState(dto.getState());
        lead.setEstimatedValue(dto.getEstimatedValue());
        lead.setNotes(dto.getNotes());

        if (dto.getNextFollowUpDate() != null && !dto.getNextFollowUpDate().isEmpty()) {
            lead.setNextFollowUpDate(LocalDate.parse(dto.getNextFollowUpDate().trim()));
        }
        if (dto.getNextFollowUpTime() != null && !dto.getNextFollowUpTime().isEmpty()) {
            lead.setNextFollowUpTime(LocalTime.parse(dto.getNextFollowUpTime().trim()));
        }
        if (dto.getCompanyId() != null) {
            lead.setCompany(companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found")));
        }
        if (dto.getContactId() != null) {
            lead.setContact(contactRepository.findById(dto.getContactId())
                    .orElseThrow(() -> new IllegalArgumentException("Contact not found")));
        }

        Lead saved = leadRepository.save(lead);
        log.info("Lead {} '{}' created by {}", saved.getLeadNumber(), saved.getTitle(), adminEmail);
        return mapToResponse(saved);
    }

    // ==================== COMBINED CALL + LEAD WORKFLOW ====================

    /**
     * The BRD's key workflow: Search by phone → if no match,
     * create Contact + Company + Lead + Call Activity in one transaction.
     */
    @Transactional
    public LeadResponse combinedCallAndLead(CombinedCallLeadDTO dto, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        // 1. Check if contact already exists by phone
        SalesContact contact = contactRepository.findByPhone(dto.getContactPhone()).orElse(null);
        SalesCompany company = null;

        if (contact != null) {
            // Contact exists — use their company
            company = contact.getCompany();
            log.info("Existing contact found: {} ({})", contact.getName(), contact.getPhone());
        } else {
            // 2. Create new company (if name provided)
            if (dto.getCompanyName() != null && !dto.getCompanyName().isEmpty()) {
                company = new SalesCompany();
                company.setName(dto.getCompanyName());
                company.setIndustry(dto.getIndustry());
                company.setCompanyType(dto.getCompanyType());
                company.setCity(dto.getCity());
                company.setState(dto.getState());
                company.setSource("phone_call");
                company.setOwnerAdmin(owner);
                company = companyRepository.save(company);
                log.info("New company '{}' created during combined call", company.getName());
            }

            // 3. Create new contact
            contact = new SalesContact();
            contact.setName(dto.getContactName());
            contact.setPhone(dto.getContactPhone());
            contact.setEmail(dto.getContactEmail());
            contact.setDesignation(dto.getContactDesignation());
            contact.setCompany(company);
            contact.setPrimary(true);
            contact = contactRepository.save(contact);
            log.info("New contact '{}' created during combined call", contact.getName());
        }

        // 4. Create the lead
        Lead lead = new Lead();
        lead.setLeadNumber(generateLeadNumber());
        lead.setTitle(dto.getLeadTitle() != null ? dto.getLeadTitle() : "Call from " + dto.getContactName());
        lead.setSource(dto.getSource() != null ? dto.getSource() : "phone_call");
        lead.setStatus(LeadStatus.CONTACTED.getValue()); // Already contacted since we're logging a call
        lead.setOwnerAdmin(owner);
        lead.setCompany(company);
        lead.setContact(contact);
        lead.setCity(dto.getCity());
        lead.setState(dto.getState());
        lead.setEstimatedValue(dto.getEstimatedValue());

        if (dto.getFollowUpDate() != null && !dto.getFollowUpDate().isEmpty()) {
            lead.setNextFollowUpDate(LocalDate.parse(dto.getFollowUpDate().trim()));
        }
        if (dto.getFollowUpTime() != null && !dto.getFollowUpTime().isEmpty()) {
            lead.setNextFollowUpTime(LocalTime.parse(dto.getFollowUpTime().trim()));
        }

        lead = leadRepository.save(lead);

        // 5. Log the call activity
        Activity activity = new Activity();
        activity.setLead(lead);
        activity.setCompany(company);
        activity.setContact(contact);
        activity.setActivityType("call");
        activity.setCallOutcome(dto.getCallOutcome());
        activity.setSubject("Initial call with " + dto.getContactName());
        activity.setNotes(dto.getCallNotes());
        activity.setDurationMinutes(dto.getCallDurationMinutes());
        activity.setPerformedByAdmin(owner);
        activity.setActivityDate(LocalDateTime.now());

        if (dto.getFollowUpDate() != null && !dto.getFollowUpDate().isEmpty()) {
            activity.setFollowUpDate(LocalDate.parse(dto.getFollowUpDate().trim()));
        }
        if (dto.getFollowUpTime() != null && !dto.getFollowUpTime().isEmpty()) {
            activity.setFollowUpTime(LocalTime.parse(dto.getFollowUpTime().trim()));
        }

        activityRepository.save(activity);

        log.info("Combined call+lead workflow complete. Lead: {}, Contact: {}, Admin: {}",
                lead.getLeadNumber(), contact.getPhone(), adminEmail);

        return mapToResponse(lead);
    }

    // ==================== STATUS MANAGEMENT ====================

    public LeadResponse updateLeadStatus(Long leadId, String newStatus) {
        Lead lead = findById(leadId);

        LeadStatus current = LeadStatus.fromString(lead.getStatus());
        LeadStatus target = LeadStatus.fromString(newStatus);

        if (target == null) {
            throw new IllegalArgumentException("Unknown lead status: " + newStatus);
        }
        if (!LeadStatus.isValidTransition(current, target)) {
            throw new IllegalArgumentException("Invalid status transition from '"
                    + lead.getStatus() + "' to '" + newStatus + "'");
        }

        lead.setStatus(target.getValue());
        Lead saved = leadRepository.save(lead);
        log.info("Lead {} status updated to '{}'", saved.getLeadNumber(), target.getValue());
        return mapToResponse(saved);
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk assign leads to a new owner admin.
     */
    @Transactional
    public BulkOperationResponse bulkAssignOwner(List<Long> leadIds, Long targetOwnerAdminId) {
        Admin targetOwner = adminRepository.findById(targetOwnerAdminId)
                .orElseThrow(() -> new IllegalArgumentException("Target admin not found with ID: " + targetOwnerAdminId));

        BulkOperationResponse response = new BulkOperationResponse();
        response.setTotalRequested(leadIds.size());

        int successCount = 0;
        for (Long leadId : leadIds) {
            try {
                Lead lead = leadRepository.findById(leadId)
                        .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + leadId));
                lead.setOwnerAdmin(targetOwner);
                leadRepository.save(lead);
                successCount++;
            } catch (Exception e) {
                response.getErrors().add("Lead ID " + leadId + ": " + e.getMessage());
            }
        }

        response.setSuccessCount(successCount);
        response.setFailureCount(leadIds.size() - successCount);
        log.info("Bulk assign completed: {}/{} leads assigned to admin {}", successCount, leadIds.size(), targetOwnerAdminId);
        return response;
    }

    /**
     * Bulk tag leads. Tags are merged (not replaced) with existing tags.
     */
    @Transactional
    public BulkOperationResponse bulkTag(List<Long> leadIds, List<String> newTags) {
        BulkOperationResponse response = new BulkOperationResponse();
        response.setTotalRequested(leadIds.size());

        int successCount = 0;
        for (Long leadId : leadIds) {
            try {
                Lead lead = leadRepository.findById(leadId)
                        .orElseThrow(() -> new IllegalArgumentException("Lead not found: " + leadId));

                // Merge existing tags with new tags
                Set<String> allTags = new HashSet<>();
                if (lead.getTags() != null && !lead.getTags().isEmpty()) {
                    allTags.addAll(Arrays.asList(lead.getTags().split(",")));
                }
                for (String tag : newTags) {
                    allTags.add(tag.trim().toLowerCase());
                }
                lead.setTags(String.join(",", allTags));
                leadRepository.save(lead);
                successCount++;
            } catch (Exception e) {
                response.getErrors().add("Lead ID " + leadId + ": " + e.getMessage());
            }
        }

        response.setSuccessCount(successCount);
        response.setFailureCount(leadIds.size() - successCount);
        log.info("Bulk tag completed: {}/{} leads tagged", successCount, leadIds.size());
        return response;
    }

    // ==================== CSV IMPORT ====================

    /**
     * Import leads from a CSV file.
     * Expected CSV headers: title,source,city,state,estimatedValue,notes,contactName,contactPhone,contactEmail,companyName
     */
    @Transactional
    public CsvImportResponse importFromCsv(MultipartFile file, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        CsvImportResponse response = new CsvImportResponse();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new IllegalArgumentException("CSV file is empty");
            }

            String[] headers = headerLine.split(",");
            int rowNum = 1;

            String line;
            while ((line = reader.readLine()) != null) {
                rowNum++;
                response.setTotalRows(response.getTotalRows() + 1);

                try {
                    String[] values = parseCsvLine(line);
                    if (values.length < 2) {
                        response.setSkippedCount(response.getSkippedCount() + 1);
                        response.getErrors().add("Row " + rowNum + ": insufficient columns");
                        continue;
                    }

                    String title = getColumnValue(headers, values, "title");
                    String source = getColumnValue(headers, values, "source");
                    String city = getColumnValue(headers, values, "city");
                    String state = getColumnValue(headers, values, "state");
                    String estimatedValueStr = getColumnValue(headers, values, "estimatedvalue");
                    String notes = getColumnValue(headers, values, "notes");
                    String contactName = getColumnValue(headers, values, "contactname");
                    String contactPhone = getColumnValue(headers, values, "contactphone");
                    String contactEmail = getColumnValue(headers, values, "contactemail");
                    String companyName = getColumnValue(headers, values, "companyname");

                    if (title == null || title.isEmpty()) {
                        title = "Imported Lead #" + rowNum;
                    }

                    // Create or find company
                    SalesCompany company = null;
                    if (companyName != null && !companyName.isEmpty()) {
                        List<SalesCompany> existingCompanies = companyRepository.findByNameContainingIgnoreCaseAndActiveTrue(companyName);
                        if (!existingCompanies.isEmpty()) {
                            company = existingCompanies.get(0);
                        } else {
                            company = new SalesCompany();
                            company.setName(companyName);
                            company.setCity(city);
                            company.setState(state);
                            company.setSource("csv_import");
                            company.setOwnerAdmin(owner);
                            company = companyRepository.save(company);
                        }
                    }

                    // Create or find contact
                    SalesContact contact = null;
                    if (contactPhone != null && !contactPhone.isEmpty()) {
                        final SalesCompany finalCompany = company;
                        contact = contactRepository.findByPhone(contactPhone).orElseGet(() -> {
                            SalesContact newContact = new SalesContact();
                            newContact.setName(contactName != null ? contactName : "Unknown");
                            newContact.setPhone(contactPhone);
                            newContact.setEmail(contactEmail);
                            newContact.setCompany(finalCompany);
                            newContact.setPrimary(true);
                            return contactRepository.save(newContact);
                        });
                    }

                    // Create lead
                    Lead lead = new Lead();
                    lead.setLeadNumber(generateLeadNumber());
                    lead.setTitle(title);
                    lead.setSource(source != null && !source.isEmpty() ? source : "csv_import");
                    lead.setStatus(LeadStatus.NEW.getValue());
                    lead.setOwnerAdmin(owner);
                    lead.setCity(city);
                    lead.setState(state);
                    lead.setNotes(notes);
                    lead.setCompany(company);
                    lead.setContact(contact);

                    if (estimatedValueStr != null && !estimatedValueStr.isEmpty()) {
                        try {
                            lead.setEstimatedValue(Double.parseDouble(estimatedValueStr));
                        } catch (NumberFormatException ignored) {
                            // Skip invalid numbers
                        }
                    }

                    leadRepository.save(lead);
                    response.setImportedCount(response.getImportedCount() + 1);

                } catch (Exception e) {
                    response.setSkippedCount(response.getSkippedCount() + 1);
                    response.getErrors().add("Row " + rowNum + ": " + e.getMessage());
                }
            }

            log.info("CSV import completed by {}: {} imported, {} skipped out of {} rows",
                    adminEmail, response.getImportedCount(), response.getSkippedCount(), response.getTotalRows());

        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse CSV file: " + e.getMessage());
        }

        return response;
    }

    // ==================== QUERIES ====================

    public LeadResponse getLeadById(Long id) {
        return mapToResponse(findById(id));
    }

    public List<LeadResponse> getAllLeads() {
        return leadRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Server-side paginated query for all leads.
     */
    public PagedResponse<LeadResponse> getAllLeadsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Lead> leadPage = leadRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<LeadResponse> content = leadPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return PagedResponse.of(content, page, size, leadPage.getTotalElements(), leadPage.getTotalPages(), leadPage.isLast());
    }

    public List<LeadResponse> getLeadsByOwner(Long adminId) {
        return leadRepository.findByOwnerAdminIdOrderByCreatedAtDesc(adminId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeadResponse> getLeadsByStatus(String status) {
        return leadRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeadResponse> getLeadsByCompany(Long companyId) {
        return leadRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeadResponse> searchByPhone(String phone) {
        return leadRepository.findByContactPhoneContaining(phone).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeadResponse> getOverdueFollowUps() {
        List<String> terminalStatuses = Arrays.asList(
                LeadStatus.CONVERTED.getValue(),
                LeadStatus.LOST.getValue());
        return leadRepository.findByNextFollowUpDateBeforeAndStatusNotIn(LocalDate.now(), terminalStatuses).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ==================== HELPERS ====================

    public Lead findById(Long id) {
        return leadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found with ID: " + id));
    }

    private String generateLeadNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "LD-" + datePart + "-" + randomPart;
    }

    /**
     * Parse a single CSV line, handling quoted values with commas inside.
     */
    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        values.add(current.toString().trim());
        return values.toArray(new String[0]);
    }

    /**
     * Get a column value by header name (case-insensitive).
     */
    private String getColumnValue(String[] headers, String[] values, String headerName) {
        for (int i = 0; i < headers.length; i++) {
            if (headers[i].trim().toLowerCase().replace("_", "").replace(" ", "")
                    .equals(headerName.toLowerCase().replace("_", "").replace(" ", ""))) {
                return i < values.length ? values[i].trim() : null;
            }
        }
        return null;
    }

    public LeadResponse mapToResponse(Lead lead) {
        LeadResponse response = new LeadResponse();
        response.setId(lead.getId());
        response.setLeadNumber(lead.getLeadNumber());
        response.setTitle(lead.getTitle());
        response.setSource(lead.getSource());
        response.setStatus(lead.getStatus());
        response.setCity(lead.getCity());
        response.setState(lead.getState());
        response.setEstimatedValue(lead.getEstimatedValue());
        response.setNotes(lead.getNotes());
        response.setNextFollowUpDate(lead.getNextFollowUpDate());
        response.setNextFollowUpTime(lead.getNextFollowUpTime());
        response.setIndiaMartLeadId(lead.getIndiaMartLeadId());
        response.setTags(lead.getTags());
        response.setConvertedToOpportunityId(lead.getConvertedToOpportunityId());
        response.setCreatedAt(lead.getCreatedAt());
        response.setUpdatedAt(lead.getUpdatedAt());

        if (lead.getCompany() != null) {
            response.setCompanyId(lead.getCompany().getId());
            response.setCompanyName(lead.getCompany().getName());
        }
        if (lead.getContact() != null) {
            response.setContactId(lead.getContact().getId());
            response.setContactName(lead.getContact().getName());
            response.setContactPhone(lead.getContact().getPhone());
        }
        if (lead.getOwnerAdmin() != null) {
            response.setOwnerAdminId(lead.getOwnerAdmin().getId());
            response.setOwnerAdminName(lead.getOwnerAdmin().getName());
        }

        return response;
    }
}

