package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateWhatsAppCampaignDTO;
import com.bentork.ev_system.dto.request.UpdateWhatsAppCampaignDTO;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.dto.response.WhatsAppCampaignResponse;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.CampaignStatus;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.CampaignRoundRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Core orchestrator for WhatsApp campaigns.
 * Implements FR-01, FR-02, FR-27, FR-29, BR-08, BR-09.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppCampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignRoundRepository roundRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final AdminRepository adminRepository;
    private final CampaignAuditService auditService;

    /**
     * Creates a new WhatsApp campaign in DRAFT or SCHEDULED status (FR-01, FR-02).
     */
    @Transactional
    public WhatsAppCampaignResponse createCampaign(CreateWhatsAppCampaignDTO dto, String adminEmail) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Campaign name is required");
        }

        Campaign campaign = new Campaign();
        campaign.setName(dto.getName().trim());
        campaign.setType("WHATSAPP_OUTREACH");
        campaign.setChannel("WHATSAPP");
        campaign.setObjective(dto.getObjective());
        campaign.setDescription(dto.getDescription());
        campaign.setStartDate(dto.getStartDate());
        campaign.setEndDate(dto.getEndDate());
        campaign.setTimezone(dto.getTimezone() != null ? dto.getTimezone() : "Asia/Kolkata");
        campaign.setSendMode(dto.getSendMode() != null ? dto.getSendMode().toUpperCase().trim() : "MANUAL");
        campaign.setTargetAudienceSegmentId(dto.getTargetAudienceSegmentId());
        campaign.setCreatedByAdminEmail(adminEmail);
        campaign.setStatus(CampaignStatus.DRAFT.getValue());

        // Assign owner admin
        if (dto.getOwnerAdminId() != null) {
            Admin owner = adminRepository.findById(dto.getOwnerAdminId())
                    .orElseThrow(() -> new IllegalArgumentException("Owner admin not found with id: " + dto.getOwnerAdminId()));
            campaign.setOwnerAdmin(owner);
        } else {
            // Default to the creator if found
            adminRepository.findByEmail(adminEmail).ifPresent(campaign::setOwnerAdmin);
        }

        Campaign saved = campaignRepository.save(campaign);

        auditService.logCampaign(saved.getId(), CampaignAuditAction.CAMPAIGN_CREATED.getValue(),
                "Campaign created with name: " + saved.getName(), adminEmail);

        log.info("WhatsApp Campaign '{}' (ID: {}) created by {}", saved.getName(), saved.getId(), adminEmail);
        return mapToResponse(saved);
    }

    /**
     * Updates an existing campaign's configuration (allowed only in DRAFT or SCHEDULED).
     */
    @Transactional
    public WhatsAppCampaignResponse updateCampaign(Long campaignId, UpdateWhatsAppCampaignDTO dto, String adminEmail) {
        Campaign campaign = getCampaignEntity(campaignId);

        if (!CampaignStatus.DRAFT.getValue().equalsIgnoreCase(campaign.getStatus())
                && !CampaignStatus.SCHEDULED.getValue().equalsIgnoreCase(campaign.getStatus())) {
            throw new IllegalStateException("Only DRAFT or SCHEDULED campaigns can be modified");
        }

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            campaign.setName(dto.getName().trim());
        }
        if (dto.getObjective() != null) {
            campaign.setObjective(dto.getObjective());
        }
        if (dto.getDescription() != null) {
            campaign.setDescription(dto.getDescription());
        }
        if (dto.getStartDate() != null) {
            campaign.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            campaign.setEndDate(dto.getEndDate());
        }
        if (dto.getTimezone() != null) {
            campaign.setTimezone(dto.getTimezone());
        }
        if (dto.getSendMode() != null) {
            campaign.setSendMode(dto.getSendMode().toUpperCase().trim());
        }
        if (dto.getOwnerAdminId() != null) {
            adminRepository.findById(dto.getOwnerAdminId()).ifPresent(campaign::setOwnerAdmin);
        }

        Campaign updated = campaignRepository.save(campaign);
        auditService.logCampaign(campaignId, CampaignAuditAction.CAMPAIGN_UPDATED.getValue(), "Campaign details updated", adminEmail);

        return mapToResponse(updated);
    }

    /**
     * Activates a campaign (transitions from DRAFT or SCHEDULED to ACTIVE).
     */
    @Transactional
    public WhatsAppCampaignResponse activateCampaign(Long campaignId, String adminEmail) {
        Campaign campaign = getCampaignEntity(campaignId);

        CampaignStatus current = CampaignStatus.fromString(campaign.getStatus());
        if (!CampaignStatus.isValidTransition(current, CampaignStatus.ACTIVE)) {
            throw new IllegalStateException("Cannot transition campaign from " + campaign.getStatus() + " to ACTIVE");
        }

        // Validate campaign has at least one configured round
        long roundCount = roundRepository.countByCampaignId(campaignId);
        if (roundCount == 0) {
            throw new IllegalStateException("Cannot activate a campaign without at least one configured round");
        }

        campaign.setStatus(CampaignStatus.ACTIVE.getValue());
        campaign.setPauseReason(null);
        campaign.setPausedAt(null);
        campaign.setPausedByAdminEmail(null);

        Campaign updated = campaignRepository.save(campaign);
        auditService.logCampaign(campaignId, CampaignAuditAction.CAMPAIGN_ACTIVATED.getValue(), "Campaign activated", adminEmail);

        log.info("Campaign '{}' (ID: {}) activated by {}", updated.getName(), campaignId, adminEmail);
        return mapToResponse(updated);
    }

    /**
     * Pauses an active campaign (FR-29).
     */
    @Transactional
    public WhatsAppCampaignResponse pauseCampaign(Long campaignId, String reason, String adminEmail) {
        Campaign campaign = getCampaignEntity(campaignId);

        if (!CampaignStatus.ACTIVE.getValue().equalsIgnoreCase(campaign.getStatus())) {
            throw new IllegalStateException("Only ACTIVE campaigns can be paused");
        }

        campaign.setStatus(CampaignStatus.PAUSED.getValue());
        campaign.setPauseReason(reason != null ? reason : "MANUAL_PAUSE");
        campaign.setPausedAt(LocalDateTime.now());
        campaign.setPausedByAdminEmail(adminEmail);

        Campaign updated = campaignRepository.save(campaign);
        auditService.logCampaign(campaignId, CampaignAuditAction.CAMPAIGN_PAUSED.getValue(), "Campaign paused: " + reason, adminEmail);

        log.info("Campaign '{}' (ID: {}) paused by {}: {}", updated.getName(), campaignId, adminEmail, reason);
        return mapToResponse(updated);
    }

    /**
     * Resumes a paused campaign back to ACTIVE (FR-29).
     */
    @Transactional
    public WhatsAppCampaignResponse resumeCampaign(Long campaignId, String adminEmail) {
        Campaign campaign = getCampaignEntity(campaignId);

        if (!CampaignStatus.PAUSED.getValue().equalsIgnoreCase(campaign.getStatus())) {
            throw new IllegalStateException("Only PAUSED campaigns can be resumed");
        }

        campaign.setStatus(CampaignStatus.ACTIVE.getValue());
        campaign.setPauseReason(null);
        campaign.setPausedAt(null);
        campaign.setPausedByAdminEmail(null);

        Campaign updated = campaignRepository.save(campaign);
        auditService.logCampaign(campaignId, CampaignAuditAction.CAMPAIGN_RESUMED.getValue(), "Campaign resumed", adminEmail);

        log.info("Campaign '{}' (ID: {}) resumed by {}", updated.getName(), campaignId, adminEmail);
        return mapToResponse(updated);
    }

    /**
     * Cancels a campaign.
     */
    @Transactional
    public WhatsAppCampaignResponse cancelCampaign(Long campaignId, String adminEmail) {
        Campaign campaign = getCampaignEntity(campaignId);

        if (CampaignStatus.COMPLETED.getValue().equalsIgnoreCase(campaign.getStatus())) {
            throw new IllegalStateException("Cannot cancel a completed campaign");
        }

        campaign.setStatus(CampaignStatus.CANCELLED.getValue());
        Campaign updated = campaignRepository.save(campaign);

        auditService.logCampaign(campaignId, CampaignAuditAction.CAMPAIGN_CANCELLED.getValue(), "Campaign cancelled", adminEmail);
        log.info("Campaign '{}' (ID: {}) cancelled by {}", updated.getName(), campaignId, adminEmail);
        return mapToResponse(updated);
    }

    /**
     * Gets a single campaign by ID.
     */
    @Transactional(readOnly = true)
    public WhatsAppCampaignResponse getCampaignById(Long campaignId) {
        Campaign campaign = getCampaignEntity(campaignId);
        return mapToResponse(campaign);
    }

    /**
     * Gets paginated list of WhatsApp campaigns with optional status filtering.
     */
    @Transactional(readOnly = true)
    public PagedResponse<WhatsAppCampaignResponse> getAllCampaigns(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Campaign> campaignPage;

        if (status != null && !status.trim().isEmpty()) {
            campaignPage = campaignRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase().trim(), pageable);
        } else {
            campaignPage = campaignRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        List<WhatsAppCampaignResponse> content = campaignPage.getContent().stream()
                .filter(c -> "WHATSAPP".equalsIgnoreCase(c.getChannel()) || "WHATSAPP_OUTREACH".equalsIgnoreCase(c.getType()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PagedResponse.of(content, page, size, campaignPage.getTotalElements(), campaignPage.getTotalPages(), campaignPage.isLast());
    }

    public Campaign getCampaignEntity(Long campaignId) {
        return campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));
    }

    public WhatsAppCampaignResponse mapToResponse(Campaign c) {
        Admin owner = c.getOwnerAdmin();
        long totalMembers = membershipRepository.countByCampaignId(c.getId());
        long roundCount = roundRepository.countByCampaignId(c.getId());

        return WhatsAppCampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .objective(c.getObjective())
                .description(c.getDescription())
                .status(c.getStatus())
                .channel(c.getChannel())
                .sendMode(c.getSendMode())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .timezone(c.getTimezone())
                .ownerAdminId(owner != null ? owner.getId() : null)
                .ownerAdminName(owner != null ? owner.getName() : null)
                .ownerAdminEmail(owner != null ? owner.getEmail() : null)
                .totalRounds((int) roundCount)
                .completedRounds(c.getCompletedRounds() != null ? c.getCompletedRounds() : 0)
                .totalRecipients((int) totalMembers)
                .sentCount(c.getSentCount() != null ? c.getSentCount() : 0)
                .deliveredCount(c.getDeliveredCount() != null ? c.getDeliveredCount() : 0)
                .readCount(c.getReadCount() != null ? c.getReadCount() : 0)
                .respondedCount(c.getRespondedCount() != null ? c.getRespondedCount() : 0)
                .failedCount(c.getFailedCount() != null ? c.getFailedCount() : 0)
                .pauseReason(c.getPauseReason())
                .pausedAt(c.getPausedAt())
                .pausedByAdminEmail(c.getPausedByAdminEmail())
                .createdByAdminEmail(c.getCreatedByAdminEmail())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
