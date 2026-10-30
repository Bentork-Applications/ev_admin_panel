package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateOpportunityDTO;
import com.bentork.ev_system.dto.request.UpdateOpportunityStageDTO;
import com.bentork.ev_system.dto.response.OpportunityResponse;
import com.bentork.ev_system.enums.LeadStatus;
import com.bentork.ev_system.enums.OpportunityStage;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.Opportunity;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.OpportunityRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final LeadRepository leadRepository;
    private final SalesCompanyRepository companyRepository;
    private final SalesContactRepository contactRepository;
    private final AdminRepository adminRepository;

    @Transactional
    public OpportunityResponse createOpportunity(CreateOpportunityDTO dto, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        SalesCompany company = companyRepository.findById(dto.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));

        Opportunity opp = new Opportunity();
        opp.setOpportunityNumber(generateOpportunityNumber());
        opp.setTitle(dto.getTitle());
        opp.setCompany(company);
        opp.setOwnerAdmin(owner);
        opp.setStage(OpportunityStage.QUALIFIED.getValue());
        opp.setValue(dto.getValue());
        opp.setProbability(OpportunityStage.QUALIFIED.getProbability());
        opp.setNotes(dto.getNotes());

        if (dto.getExpectedCloseDate() != null && !dto.getExpectedCloseDate().isEmpty()) {
            opp.setExpectedCloseDate(LocalDate.parse(dto.getExpectedCloseDate()));
        }
        if (dto.getContactId() != null) {
            opp.setContact(contactRepository.findById(dto.getContactId())
                    .orElseThrow(() -> new IllegalArgumentException("Contact not found")));
        }
        if (dto.getLeadId() != null) {
            Lead lead = leadRepository.findById(dto.getLeadId())
                    .orElseThrow(() -> new IllegalArgumentException("Lead not found"));
            opp.setLead(lead);
        }

        Opportunity saved = opportunityRepository.save(opp);
        log.info("Opportunity {} '{}' created by {}", saved.getOpportunityNumber(), saved.getTitle(), adminEmail);
        return mapToResponse(saved);
    }

    /**
     * Convert a qualified Lead into an Opportunity in one step.
     */
    @Transactional
    public OpportunityResponse convertLeadToOpportunity(Long leadId, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new IllegalArgumentException("Lead not found"));

        if (!LeadStatus.QUALIFIED.matches(lead.getStatus())) {
            throw new IllegalArgumentException("Lead must be in QUALIFIED status to convert. Current: " + lead.getStatus());
        }

        if (lead.getCompany() == null) {
            throw new IllegalArgumentException("Lead must have an associated company to convert to an opportunity");
        }

        Opportunity opp = new Opportunity();
        opp.setOpportunityNumber(generateOpportunityNumber());
        opp.setTitle(lead.getTitle());
        opp.setLead(lead);
        opp.setCompany(lead.getCompany());
        opp.setContact(lead.getContact());
        opp.setOwnerAdmin(owner);
        opp.setStage(OpportunityStage.QUALIFIED.getValue());
        opp.setValue(lead.getEstimatedValue());
        opp.setProbability(OpportunityStage.QUALIFIED.getProbability());

        Opportunity saved = opportunityRepository.save(opp);

        // Update the lead
        lead.setStatus(LeadStatus.CONVERTED.getValue());
        lead.setConvertedToOpportunityId(saved.getId());
        leadRepository.save(lead);

        log.info("Lead {} converted to Opportunity {} by {}", lead.getLeadNumber(), saved.getOpportunityNumber(), adminEmail);
        return mapToResponse(saved);
    }

    /**
     * Update opportunity stage with validation.
     */
    public OpportunityResponse updateStage(Long opportunityId, UpdateOpportunityStageDTO dto) {
        Opportunity opp = findById(opportunityId);

        OpportunityStage current = OpportunityStage.fromString(opp.getStage());
        OpportunityStage target = OpportunityStage.fromString(dto.getStage());

        if (target == null) {
            throw new IllegalArgumentException("Unknown opportunity stage: " + dto.getStage());
        }
        if (!OpportunityStage.isValidTransition(current, target)) {
            throw new IllegalArgumentException("Invalid stage transition from '"
                    + opp.getStage() + "' to '" + dto.getStage() + "'");
        }

        opp.setStage(target.getValue());
        opp.setProbability(target.getProbability());

        if (target == OpportunityStage.LOST) {
            opp.setLostReason(dto.getLostReason());
        }

        Opportunity saved = opportunityRepository.save(opp);
        log.info("Opportunity {} stage updated to '{}'", saved.getOpportunityNumber(), target.getValue());
        return mapToResponse(saved);
    }

    // ==================== KANBAN & QUERIES ====================

    public List<OpportunityResponse> getKanbanData() {
        List<String> activeStages = Arrays.asList(
                OpportunityStage.QUALIFIED.getValue(),
                OpportunityStage.REQUIREMENT.getValue(),
                OpportunityStage.PROPOSAL.getValue(),
                OpportunityStage.NEGOTIATION.getValue());
        return opportunityRepository.findByStageInOrderByExpectedCloseDateAsc(activeStages).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<OpportunityResponse> getAllOpportunities() {
        return opportunityRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public OpportunityResponse getOpportunityById(Long id) {
        return mapToResponse(findById(id));
    }

    public List<OpportunityResponse> getOpportunitiesByCompany(Long companyId) {
        return opportunityRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public Double getWeightedPipelineValue() {
        Double value = opportunityRepository.getWeightedPipelineValue();
        return value != null ? value : 0.0;
    }

    // ==================== HELPERS ====================

    public Opportunity findById(Long id) {
        return opportunityRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found with ID: " + id));
    }

    private String generateOpportunityNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "OPP-" + datePart + "-" + randomPart;
    }

    public OpportunityResponse mapToResponse(Opportunity opp) {
        OpportunityResponse response = new OpportunityResponse();
        response.setId(opp.getId());
        response.setOpportunityNumber(opp.getOpportunityNumber());
        response.setTitle(opp.getTitle());
        response.setStage(opp.getStage());
        response.setValue(opp.getValue());
        response.setExpectedCloseDate(opp.getExpectedCloseDate());
        response.setProbability(opp.getProbability());
        response.setLinkedOrderId(opp.getLinkedOrderId());
        response.setLostReason(opp.getLostReason());
        response.setNotes(opp.getNotes());
        response.setCreatedAt(opp.getCreatedAt());
        response.setUpdatedAt(opp.getUpdatedAt());

        if (opp.getCompany() != null) {
            response.setCompanyId(opp.getCompany().getId());
            response.setCompanyName(opp.getCompany().getName());
        }
        if (opp.getContact() != null) {
            response.setContactId(opp.getContact().getId());
            response.setContactName(opp.getContact().getName());
        }
        if (opp.getLead() != null) {
            response.setLeadId(opp.getLead().getId());
            response.setLeadNumber(opp.getLead().getLeadNumber());
        }
        if (opp.getOwnerAdmin() != null) {
            response.setOwnerAdminId(opp.getOwnerAdmin().getId());
            response.setOwnerAdminName(opp.getOwnerAdmin().getName());
        }

        return response;
    }
}
