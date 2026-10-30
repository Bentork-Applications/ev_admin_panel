package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateCampaignRoundDTO;
import com.bentork.ev_system.dto.request.UpdateCampaignRoundDTO;
import com.bentork.ev_system.dto.response.CampaignRoundResponse;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.WhatsAppTemplate;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.CampaignRoundRepository;
import com.bentork.ev_system.repository.WhatsAppTemplateRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for configuring and managing messaging rounds within a campaign.
 * Implements FR-08, FR-10, BR-03.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignRoundService {

    private final CampaignRepository campaignRepository;
    private final CampaignRoundRepository roundRepository;
    private final WhatsAppTemplateRepository templateRepository;
    private final CampaignAuditService auditService;

    /**
     * Adds a new messaging round to an existing campaign (FR-08).
     */
    @Transactional
    public CampaignRoundResponse addRound(Long campaignId, CreateCampaignRoundDTO dto, String adminEmail) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        if ("COMPLETED".equalsIgnoreCase(campaign.getStatus()) || "CANCELLED".equalsIgnoreCase(campaign.getStatus())) {
            throw new IllegalStateException("Cannot add rounds to a " + campaign.getStatus() + " campaign");
        }

        // Determine round number
        int nextRoundNumber = dto.getRoundNumber() != null ? dto.getRoundNumber() :
                (int) roundRepository.countByCampaignId(campaignId) + 1;

        // Check BR-03: unique campaign ID and round number
        if (roundRepository.findByCampaignIdAndRoundNumber(campaignId, nextRoundNumber).isPresent()) {
            throw new IllegalArgumentException("Round " + nextRoundNumber + " already exists for this campaign");
        }

        CampaignRound round = new CampaignRound();
        round.setCampaign(campaign);
        round.setRoundNumber(nextRoundNumber);

        // Resolve template
        String templateName = dto.getTemplateName();
        String templateBody = dto.getTemplateBody();
        String templateStatus = "APPROVED";

        if (dto.getTemplateId() != null) {
            WhatsAppTemplate template = templateRepository.findById(dto.getTemplateId())
                    .orElseThrow(() -> new IllegalArgumentException("WhatsApp template not found with id: " + dto.getTemplateId()));
            templateName = template.getName();
            templateBody = template.getBody();
            templateStatus = template.getApprovalStatus();
            round.setTemplateId(template.getId());
        }

        if (templateName == null || templateName.trim().isEmpty()) {
            throw new IllegalArgumentException("Template name is mandatory for a round");
        }

        round.setTemplateName(templateName.trim());
        round.setTemplateBody(templateBody);
        round.setTemplateStatus(templateStatus);
        round.setPlannedDate(dto.getPlannedDate());
        round.setPlannedTime(dto.getPlannedTime());
        round.setTimezone(dto.getTimezone() != null ? dto.getTimezone() : campaign.getTimezone());
        round.setSendMode(dto.getSendMode() != null ? dto.getSendMode().toUpperCase().trim() : campaign.getSendMode());
        round.setStatus(dto.getPlannedDate() != null ? CampaignRoundStatus.SCHEDULED.getValue() : CampaignRoundStatus.PENDING.getValue());

        CampaignRound saved = roundRepository.save(round);

        // Update campaign's total rounds
        campaign.setTotalRounds((int) roundRepository.countByCampaignId(campaignId));
        campaignRepository.save(campaign);

        auditService.logRound(campaignId, saved.getId(), CampaignAuditAction.ROUND_CREATED.getValue(),
                "Round " + saved.getRoundNumber() + " created with template " + saved.getTemplateName(), adminEmail);

        log.info("Round {} added to Campaign '{}' (ID: {}) by {}", saved.getRoundNumber(), campaign.getName(), campaignId, adminEmail);

        return mapToResponse(saved);
    }

    /**
     * Updates an existing round's schedule, template, or send mode.
     */
    @Transactional
    public CampaignRoundResponse updateRound(Long campaignId, Long roundId, UpdateCampaignRoundDTO dto, String adminEmail) {
        CampaignRound round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign round not found with id: " + roundId));

        if (!round.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("Round does not belong to specified campaign");
        }

        if ("COMPLETED".equalsIgnoreCase(round.getStatus())) {
            throw new IllegalStateException("Cannot update a completed round");
        }

        if (dto.getTemplateId() != null) {
            WhatsAppTemplate template = templateRepository.findById(dto.getTemplateId())
                    .orElseThrow(() -> new IllegalArgumentException("Template not found with id: " + dto.getTemplateId()));
            round.setTemplateId(template.getId());
            round.setTemplateName(template.getName());
            round.setTemplateBody(template.getBody());
            round.setTemplateStatus(template.getApprovalStatus());
        } else if (dto.getTemplateName() != null && !dto.getTemplateName().trim().isEmpty()) {
            round.setTemplateName(dto.getTemplateName().trim());
        }

        if (dto.getTemplateBody() != null) {
            round.setTemplateBody(dto.getTemplateBody());
        }

        if (dto.getPlannedDate() != null) {
            round.setPlannedDate(dto.getPlannedDate());
            if (CampaignRoundStatus.PENDING.getValue().equalsIgnoreCase(round.getStatus())) {
                round.setStatus(CampaignRoundStatus.SCHEDULED.getValue());
            }
        }

        if (dto.getPlannedTime() != null) {
            round.setPlannedTime(dto.getPlannedTime());
        }

        if (dto.getTimezone() != null) {
            round.setTimezone(dto.getTimezone());
        }

        if (dto.getSendMode() != null) {
            round.setSendMode(dto.getSendMode().toUpperCase().trim());
        }

        CampaignRound updated = roundRepository.save(round);

        auditService.logRound(campaignId, round.getId(), CampaignAuditAction.ROUND_UPDATED.getValue(),
                "Round " + round.getRoundNumber() + " updated", adminEmail);

        return mapToResponse(updated);
    }

    /**
     * Lists all rounds for a campaign ordered by round number.
     */
    @Transactional(readOnly = true)
    public List<CampaignRoundResponse> getRoundsForCampaign(Long campaignId) {
        return roundRepository.findByCampaignIdOrderByRoundNumberAsc(campaignId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get specific round by ID.
     */
    @Transactional(readOnly = true)
    public CampaignRoundResponse getRoundById(Long roundId) {
        CampaignRound round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign round not found with id: " + roundId));
        return mapToResponse(round);
    }

    /**
     * Deletes a round if it has not yet been executed.
     */
    @Transactional
    public void deleteRound(Long campaignId, Long roundId, String adminEmail) {
        CampaignRound round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign round not found with id: " + roundId));

        if (!round.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("Round does not belong to specified campaign");
        }

        if (!CampaignRoundStatus.PENDING.getValue().equalsIgnoreCase(round.getStatus())
                && !CampaignRoundStatus.SCHEDULED.getValue().equalsIgnoreCase(round.getStatus())) {
            throw new IllegalStateException("Only pending or scheduled rounds can be deleted");
        }

        Campaign campaign = round.getCampaign();
        roundRepository.delete(round);

        campaign.setTotalRounds((int) roundRepository.countByCampaignId(campaignId));
        campaignRepository.save(campaign);

        auditService.logRound(campaignId, roundId, CampaignAuditAction.ROUND_CANCELLED.getValue(),
                "Round " + round.getRoundNumber() + " deleted", adminEmail);
    }

    public CampaignRoundResponse mapToResponse(CampaignRound r) {
        return CampaignRoundResponse.builder()
                .id(r.getId())
                .campaignId(r.getCampaign() != null ? r.getCampaign().getId() : null)
                .campaignName(r.getCampaign() != null ? r.getCampaign().getName() : null)
                .roundNumber(r.getRoundNumber())
                .templateName(r.getTemplateName())
                .templateBody(r.getTemplateBody())
                .templateId(r.getTemplateId())
                .templateStatus(r.getTemplateStatus())
                .plannedDate(r.getPlannedDate())
                .plannedTime(r.getPlannedTime())
                .timezone(r.getTimezone())
                .sendMode(r.getSendMode())
                .status(r.getStatus())
                .eligibleCount(r.getEligibleCount())
                .sentCount(r.getSentCount())
                .deliveredCount(r.getDeliveredCount())
                .readCount(r.getReadCount())
                .failedCount(r.getFailedCount())
                .skippedCount(r.getSkippedCount())
                .startedAt(r.getStartedAt())
                .completedAt(r.getCompletedAt())
                .triggeredByAdminEmail(r.getTriggeredByAdminEmail())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
