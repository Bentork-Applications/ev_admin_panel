package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.AddRecipientsDTO;
import com.bentork.ev_system.dto.request.CreateCampaignDTO;
import com.bentork.ev_system.dto.response.CampaignResponse;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignRecipient;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.CampaignRecipientRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final SalesCompanyRepository salesCompanyRepository;

    @Transactional
    public CampaignResponse createCampaign(CreateCampaignDTO dto, String adminEmail) {
        Campaign campaign = new Campaign();
        campaign.setName(dto.getName());
        campaign.setType(dto.getType());
        campaign.setDescription(dto.getDescription());
        campaign.setScheduledDate(dto.getScheduledDate());
        campaign.setCreatedByAdminEmail(adminEmail);
        
        Campaign saved = campaignRepository.save(campaign);
        return mapToResponse(saved);
    }

    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CampaignResponse getCampaignById(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + id));
        return mapToResponse(campaign);
    }

    @Transactional
    public CampaignResponse updateCampaignStatus(Long id, String status) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + id));
        
        campaign.setStatus(status);
        Campaign updated = campaignRepository.save(campaign);
        return mapToResponse(updated);
    }

    @Transactional
    public CampaignResponse addRecipients(Long campaignId, AddRecipientsDTO dto) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        if (dto.getCompanyIds() != null && !dto.getCompanyIds().isEmpty()) {
            List<SalesCompany> companies = salesCompanyRepository.findAllById(dto.getCompanyIds());
            
            for (SalesCompany company : companies) {
                CampaignRecipient recipient = new CampaignRecipient();
                recipient.setCampaign(campaign);
                recipient.setCompany(company);
                campaignRecipientRepository.save(recipient);
            }
            
            campaign.setTotalRecipients(campaign.getTotalRecipients() + companies.size());
            campaign = campaignRepository.save(campaign);
        }

        return mapToResponse(campaign);
    }

    private CampaignResponse mapToResponse(Campaign campaign) {
        CampaignResponse response = new CampaignResponse();
        response.setId(campaign.getId());
        response.setName(campaign.getName());
        response.setType(campaign.getType());
        response.setDescription(campaign.getDescription());
        response.setScheduledDate(campaign.getScheduledDate());
        response.setStatus(campaign.getStatus());
        response.setTotalRecipients(campaign.getTotalRecipients());
        response.setSentCount(campaign.getSentCount());
        response.setOpenedCount(campaign.getOpenedCount());
        response.setRespondedCount(campaign.getRespondedCount());
        response.setCreatedByAdminEmail(campaign.getCreatedByAdminEmail());
        response.setCreatedAt(campaign.getCreatedAt());
        response.setUpdatedAt(campaign.getUpdatedAt());
        return response;
    }
}
