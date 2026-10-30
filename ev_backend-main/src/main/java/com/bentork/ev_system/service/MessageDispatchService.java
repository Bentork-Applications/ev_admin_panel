package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.response.RoundProgressResponse;
import com.bentork.ev_system.dto.response.WhatsAppSendResult;
import com.bentork.ev_system.enums.ActivityType;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.enums.MessageStatus;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.CampaignMessage;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.CampaignRoundRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service that handles round-level WhatsApp messaging execution.
 * Orchestrates pre-send eligibility validation, idempotency checks,
 * provider submission, automatic activity timeline logging, and round progress updates.
 *
 * Implements FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, BR-04, BR-06, BR-12.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessageDispatchService {

    private final CampaignRepository campaignRepository;
    private final CampaignRoundRepository roundRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final CampaignMessageRepository messageRepository;
    private final ActivityRepository activityRepository;
    private final AdminRepository adminRepository;
    private final EligibilityEngine eligibilityEngine;
    private final WhatsAppDispatchService whatsAppDispatchService;
    private final CampaignAuditService auditService;

    /**
     * Executes dispatch of all eligible recipients for a given campaign round (FR-11).
     */
    @Transactional
    public RoundProgressResponse dispatchRound(Long campaignId, Long roundId, String triggeredBy) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        CampaignRound round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign round not found with id: " + roundId));

        if (!round.getCampaign().getId().equals(campaignId)) {
            throw new IllegalArgumentException("Round does not belong to specified campaign");
        }

        // Set round to IN_PROGRESS
        round.setStatus(CampaignRoundStatus.IN_PROGRESS.getValue());
        round.setStartedAt(LocalDateTime.now());
        round.setTriggeredByAdminEmail(triggeredBy);
        roundRepository.save(round);

        auditService.logRound(campaignId, roundId, CampaignAuditAction.ROUND_TRIGGERED.getValue(),
                "Round dispatch initiated by " + triggeredBy, triggeredBy);

        // Fetch all members associated with this campaign
        List<CampaignMembership> members = membershipRepository.findByCampaignId(campaignId);

        int eligibleCount = 0;
        int sentCount = 0;
        int failedCount = 0;
        int skippedCount = 0;
        List<String> errors = new ArrayList<>();

        Admin triggerAdmin = adminRepository.findByEmail(triggeredBy).orElse(campaign.getOwnerAdmin());

        for (CampaignMembership membership : members) {
            Lead lead = membership.getLead();
            if (lead == null) continue;

            // 1. Eligibility Check (FR-12, BR-06)
            EligibilityEngine.EligibilityResult eligibility = eligibilityEngine.checkEligibility(campaign, round, membership);

            String idempotencyKey = CampaignMessage.generateIdempotencyKey(campaignId, roundId, lead.getId());

            if (!eligibility.isEligible()) {
                // Record skipped message for operational transparency (AC-06)
                if (!messageRepository.existsByIdempotencyKey(idempotencyKey)) {
                    CampaignMessage skippedMsg = new CampaignMessage();
                    skippedMsg.setMembership(membership);
                    skippedMsg.setRound(round);
                    skippedMsg.setLead(lead);
                    skippedMsg.setIdempotencyKey(idempotencyKey);
                    skippedMsg.setStatus(MessageStatus.SKIPPED.getValue());
                    skippedMsg.setSkipReason(eligibility.getSkipReason());
                    skippedMsg.setTriggeredBy(triggeredBy);
                    messageRepository.save(skippedMsg);
                }
                skippedCount++;
                continue;
            }

            eligibleCount++;

            // 2. Resolve contact and personalization details
            String recipientName = membership.getContactName() != null ? membership.getContactName() :
                    (lead.getContact() != null ? lead.getContact().getName() : "Customer");
            String companyName = lead.getCompany() != null ? lead.getCompany().getName() : "";
            String phone = eligibility.getNormalizedPhone();

            // 3. Prepare or reuse message instance
            CampaignMessage message = messageRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseGet(() -> {
                        CampaignMessage newMsg = new CampaignMessage();
                        newMsg.setMembership(membership);
                        newMsg.setRound(round);
                        newMsg.setLead(lead);
                        newMsg.setIdempotencyKey(idempotencyKey);
                        return newMsg;
                    });

            message.setPhone(phone);
            message.setTemplateUsed(round.getTemplateName());
            message.setStatus(MessageStatus.QUEUED.getValue());
            message.setTriggeredBy(triggeredBy);
            message.setQueuedAt(LocalDateTime.now());
            message = messageRepository.save(message);

            // 4. Submit to WhatsApp provider (FR-13)
            WhatsAppSendResult sendResult = whatsAppDispatchService.sendCampaignMessage(
                    phone,
                    round.getTemplateBody(),
                    round.getTemplateName(),
                    recipientName,
                    companyName
            );

            // 5. Update message outcome
            if (sendResult.isSuccess()) {
                message.setStatus(MessageStatus.SUBMITTED.getValue());
                message.setProviderMessageId(sendResult.getProviderMessageId());
                message.setSubmittedAt(LocalDateTime.now());
                message.setSentAt(LocalDateTime.now()); // Initially mark as sent/submitted
                message.setErrorMessage(null);
                sentCount++;

                // Update membership progress
                membership.setCurrentRound(round.getRoundNumber());
                membershipRepository.save(membership);

                // 6. Write to Lead timeline (FR-15)
                logLeadActivity(lead, campaign, round, message, triggerAdmin);

            } else {
                message.setStatus(MessageStatus.FAILED.getValue());
                message.setErrorCode(sendResult.getErrorCode());
                message.setErrorMessage(sendResult.getErrorMessage());
                message.setFailedAt(LocalDateTime.now());
                message.setRetryCount(message.getRetryCount() != null ? message.getRetryCount() + 1 : 1);
                failedCount++;

                String errSnippet = "Lead " + lead.getLeadNumber() + " (" + phone + "): " + sendResult.getErrorMessage();
                errors.add(errSnippet);
            }

            messageRepository.save(message);
        }

        // 7. Update round statistics
        round.setEligibleCount(eligibleCount);
        round.setSentCount(sentCount);
        round.setFailedCount(failedCount);
        round.setSkippedCount(skippedCount);
        round.setCompletedAt(LocalDateTime.now());
        round.setStatus(CampaignRoundStatus.COMPLETED.getValue());
        roundRepository.save(round);

        // 8. Update campaign aggregate counts
        campaign.setSentCount((campaign.getSentCount() != null ? campaign.getSentCount() : 0) + sentCount);
        campaign.setFailedCount((campaign.getFailedCount() != null ? campaign.getFailedCount() : 0) + failedCount);
        campaign.setCompletedRounds((campaign.getCompletedRounds() != null ? campaign.getCompletedRounds() : 0) + 1);

        // Check if all planned rounds are completed
        long totalRounds = roundRepository.countByCampaignId(campaignId);
        if (campaign.getCompletedRounds() >= totalRounds && totalRounds > 0) {
            campaign.setStatus("COMPLETED");
            log.info("All {} rounds completed for Campaign '{}' (ID: {}). Campaign marked as COMPLETED.",
                    totalRounds, campaign.getName(), campaignId);
        }
        campaignRepository.save(campaign);

        auditService.logRound(campaignId, roundId, CampaignAuditAction.ROUND_COMPLETED.getValue(),
                String.format("Round %d executed: %d sent, %d failed, %d skipped",
                        round.getRoundNumber(), sentCount, failedCount, skippedCount), triggeredBy);

        log.info("Round {} execution completed for Campaign '{}': eligible={}, sent={}, failed={}, skipped={}",
                round.getRoundNumber(), campaign.getName(), eligibleCount, sentCount, failedCount, skippedCount);

        return RoundProgressResponse.builder()
                .roundId(roundId)
                .roundNumber(round.getRoundNumber())
                .status(round.getStatus())
                .totalAudience(members.size())
                .eligibleCount(eligibleCount)
                .submittedCount(sentCount)
                .sentCount(sentCount)
                .deliveredCount(round.getDeliveredCount())
                .readCount(round.getReadCount())
                .failedCount(failedCount)
                .skippedCount(skippedCount)
                .recentErrors(errors.size() > 5 ? errors.subList(0, 5) : errors)
                .build();
    }

    /**
     * Retries failed messages for a specific round (FR-16).
     */
    @Transactional
    public RoundProgressResponse retryFailedMessages(Long campaignId, Long roundId, List<Long> specificMessageIds, String triggeredBy) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        CampaignRound round = roundRepository.findById(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Round not found with id: " + roundId));

        List<CampaignMessage> failedMessages;
        if (specificMessageIds != null && !specificMessageIds.isEmpty()) {
            failedMessages = messageRepository.findAllById(specificMessageIds);
        } else {
            failedMessages = messageRepository.findByRoundIdAndStatus(roundId, MessageStatus.FAILED.getValue());
        }

        int retrySuccessCount = 0;
        int retryFailedCount = 0;
        List<String> errors = new ArrayList<>();

        Admin triggerAdmin = adminRepository.findByEmail(triggeredBy).orElse(campaign.getOwnerAdmin());

        for (CampaignMessage message : failedMessages) {
            Lead lead = message.getLead();
            if (lead == null) continue;

            // Re-verify opt-out before retry (BR-06)
            if (lead.isOptedOut()) {
                message.setStatus(MessageStatus.SKIPPED.getValue());
                message.setSkipReason("Contact opted out prior to retry");
                messageRepository.save(message);
                continue;
            }

            WhatsAppSendResult result = whatsAppDispatchService.sendCampaignMessage(
                    message.getPhone(),
                    round.getTemplateBody(),
                    round.getTemplateName(),
                    message.getMembership().getContactName(),
                    lead.getCompany() != null ? lead.getCompany().getName() : ""
            );

            if (result.isSuccess()) {
                message.setStatus(MessageStatus.SUBMITTED.getValue());
                message.setProviderMessageId(result.getProviderMessageId());
                message.setSubmittedAt(LocalDateTime.now());
                message.setSentAt(LocalDateTime.now());
                message.setErrorMessage(null);
                message.setRetryCount(message.getRetryCount() != null ? message.getRetryCount() + 1 : 1);
                retrySuccessCount++;

                logLeadActivity(lead, campaign, round, message, triggerAdmin);
            } else {
                message.setRetryCount(message.getRetryCount() != null ? message.getRetryCount() + 1 : 1);
                message.setErrorMessage(result.getErrorMessage());
                message.setFailedAt(LocalDateTime.now());
                retryFailedCount++;
                errors.add("Lead " + lead.getLeadNumber() + ": " + result.getErrorMessage());
            }

            messageRepository.save(message);
        }

        // Adjust round counts
        round.setSentCount(round.getSentCount() + retrySuccessCount);
        round.setFailedCount(Math.max(0, round.getFailedCount() - retrySuccessCount));
        roundRepository.save(round);

        auditService.logRound(campaignId, roundId, CampaignAuditAction.MESSAGE_RETRIED.getValue(),
                String.format("Retried %d messages: %d recovered, %d failed again",
                        failedMessages.size(), retrySuccessCount, retryFailedCount), triggeredBy);

        return RoundProgressResponse.builder()
                .roundId(roundId)
                .roundNumber(round.getRoundNumber())
                .status(round.getStatus())
                .totalAudience(round.getEligibleCount())
                .eligibleCount(round.getEligibleCount())
                .sentCount(round.getSentCount())
                .failedCount(round.getFailedCount())
                .skippedCount(round.getSkippedCount())
                .recentErrors(errors)
                .build();
    }

    /**
     * Creates an activity record on the Lead timeline for traceability (FR-15).
     */
    private void logLeadActivity(Lead lead, Campaign campaign, CampaignRound round,
                                 CampaignMessage message, Admin performer) {
        try {
            Activity activity = new Activity();
            activity.setLead(lead);
            activity.setCompany(lead.getCompany());
            activity.setContact(lead.getContact());
            activity.setActivityType(ActivityType.WHATSAPP_OUTBOUND.getValue());
            activity.setSubject("WhatsApp: " + campaign.getName() + " - Round " + round.getRoundNumber());
            activity.setNotes("Template: " + round.getTemplateName() + "\nPhone: " + message.getPhone()
                    + "\nWAMID: " + message.getProviderMessageId());
            activity.setActivityDate(LocalDateTime.now());
            activity.setStatus("completed");
            activity.setCompletedAt(LocalDateTime.now());
            activity.setPerformedByAdmin(performer);

            // Campaign reference links
            activity.setCampaignId(campaign.getId());
            activity.setCampaignRoundId(round.getId());
            activity.setCampaignMessageId(message.getId());
            activity.setMessageDirection("OUTBOUND");
            activity.setProviderMessageId(message.getProviderMessageId());

            activityRepository.save(activity);
        } catch (Exception e) {
            log.error("Failed to write activity record to lead timeline for lead {}: {}", lead.getId(), e.getMessage());
        }
    }
}
