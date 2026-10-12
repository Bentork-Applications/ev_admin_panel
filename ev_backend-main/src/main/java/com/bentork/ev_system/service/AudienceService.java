package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.AudienceFilterDTO;
import com.bentork.ev_system.dto.response.AudienceSegmentResponse;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.OpportunityRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudienceService {

    private final SalesCompanyRepository salesCompanyRepository;
    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;

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
}
