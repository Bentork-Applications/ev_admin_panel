package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.AudienceFilterDTO;
import com.bentork.ev_system.dto.request.SaveAudienceSegmentDTO;
import com.bentork.ev_system.dto.response.AudienceSegmentResponse;
import com.bentork.ev_system.dto.response.AudienceSegmentSavedResponse;
import com.bentork.ev_system.model.AudienceSegment;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.AudienceSegmentRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.OpportunityRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudienceService {

    private final SalesCompanyRepository salesCompanyRepository;
    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final AudienceSegmentRepository audienceSegmentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AudienceSegmentResponse buildAudience(AudienceFilterDTO filter) {
        
        List<SalesCompany> companies = salesCompanyRepository.findAll();
        
        // Filter Companies
        if (filter.getCompanyIndustry() != null) {
            companies = companies.stream()
                .filter(c -> filter.getCompanyIndustry().equalsIgnoreCase(c.getIndustry()))
                .collect(Collectors.toList());
        }
        if (filter.getCompanyType() != null) {
            companies = companies.stream()
                .filter(c -> filter.getCompanyType().equalsIgnoreCase(c.getCompanyType()))
                .collect(Collectors.toList());
        }
        if (filter.getCity() != null) {
            companies = companies.stream()
                .filter(c -> filter.getCity().equalsIgnoreCase(c.getCity()))
                .collect(Collectors.toList());
        }
        if (filter.getState() != null) {
            companies = companies.stream()
                .filter(c -> filter.getState().equalsIgnoreCase(c.getState()))
                .collect(Collectors.toList());
        }

        List<Long> matchedCompanyIds = companies.stream()
                .map(SalesCompany::getId)
                .collect(Collectors.toList());

        // Filter Leads
        List<Lead> leads = leadRepository.findAll();
        
        if (filter.getLeadStatus() != null) {
            leads = leads.stream()
                .filter(l -> filter.getLeadStatus().equalsIgnoreCase(l.getStatus()))
                .collect(Collectors.toList());
        }
        if (filter.getLeadSource() != null) {
            leads = leads.stream()
                .filter(l -> filter.getLeadSource().equalsIgnoreCase(l.getSource()))
                .collect(Collectors.toList());
        }

        List<Long> matchedLeadIds = leads.stream()
                .map(Lead::getId)
                .collect(Collectors.toList());

        AudienceSegmentResponse response = new AudienceSegmentResponse();
        response.setMatchedCompanyIds(matchedCompanyIds);
        response.setMatchedLeadIds(matchedLeadIds);
        response.setTotalMatched(matchedCompanyIds.size() + matchedLeadIds.size());
        
        return response;
    }

    // ==================== SEGMENT PERSISTENCE ====================

    /**
     * Save an audience segment with its filter criteria for reuse.
     */
    public AudienceSegmentSavedResponse saveSegment(SaveAudienceSegmentDTO dto, String adminEmail) {
        try {
            // Build the audience first to get matched count
            AudienceSegmentResponse audienceResult = buildAudience(dto.getFilters());

            AudienceSegment segment = new AudienceSegment();
            segment.setName(dto.getName());
            segment.setDescription(dto.getDescription());
            segment.setFiltersJson(objectMapper.writeValueAsString(dto.getFilters()));
            segment.setMatchedCount(audienceResult.getTotalMatched());
            segment.setCreatedByAdminEmail(adminEmail);

            AudienceSegment saved = audienceSegmentRepository.save(segment);
            log.info("Audience segment '{}' saved by {} with {} matches", dto.getName(), adminEmail, audienceResult.getTotalMatched());
            return mapToSavedResponse(saved);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to save audience segment: " + e.getMessage());
        }
    }

    /**
     * Get all saved audience segments.
     */
    public List<AudienceSegmentSavedResponse> getAllSegments() {
        return audienceSegmentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToSavedResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a saved segment by ID.
     */
    public AudienceSegmentSavedResponse getSegmentById(Long id) {
        AudienceSegment segment = audienceSegmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Audience segment not found with ID: " + id));
        return mapToSavedResponse(segment);
    }

    /**
     * Delete a saved segment.
     */
    public void deleteSegment(Long id) {
        if (!audienceSegmentRepository.existsById(id)) {
            throw new IllegalArgumentException("Audience segment not found with ID: " + id);
        }
        audienceSegmentRepository.deleteById(id);
        log.info("Audience segment {} deleted", id);
    }

    // ==================== HELPERS ====================

    private AudienceSegmentSavedResponse mapToSavedResponse(AudienceSegment segment) {
        AudienceSegmentSavedResponse response = new AudienceSegmentSavedResponse();
        response.setId(segment.getId());
        response.setName(segment.getName());
        response.setDescription(segment.getDescription());
        response.setFiltersJson(segment.getFiltersJson());
        response.setMatchedCount(segment.getMatchedCount());
        response.setCreatedByAdminEmail(segment.getCreatedByAdminEmail());
        response.setCreatedAt(segment.getCreatedAt());
        response.setUpdatedAt(segment.getUpdatedAt());
        return response;
    }
}

