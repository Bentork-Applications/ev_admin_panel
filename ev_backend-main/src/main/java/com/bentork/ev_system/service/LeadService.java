package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CombinedCallLeadDTO;
import com.bentork.ev_system.dto.request.CreateLeadDTO;
import com.bentork.ev_system.dto.response.LeadResponse;
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
            lead.setNextFollowUpDate(LocalDate.parse(dto.getNextFollowUpDate()));
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
            lead.setNextFollowUpDate(LocalDate.parse(dto.getFollowUpDate()));
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
            activity.setFollowUpDate(LocalDate.parse(dto.getFollowUpDate()));
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

    // ==================== QUERIES ====================

    public LeadResponse getLeadById(Long id) {
        return mapToResponse(findById(id));
    }

    public List<LeadResponse> getAllLeads() {
        return leadRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
        response.setIndiaMartLeadId(lead.getIndiaMartLeadId());
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
