package com.bentork.ev_system.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.enums.ActivityType;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.MembershipStatus;
import com.bentork.ev_system.enums.MessageStatus;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.CampaignMessage;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.ContactSuppression;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.CampaignRoundRepository;
import com.bentork.ev_system.repository.ContactSuppressionRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.util.PhoneNormalizationUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for processing inbound Meta WhatsApp Cloud API webhooks.
 * Handles delivery, read, failure callbacks (FR-14, BR-05) and inbound replies with
 * pause-on-reply and opt-out suppression automation (FR-20, FR-21, FR-22, BR-07).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookService {

    private final CampaignMessageRepository messageRepository;
    private final CampaignRoundRepository roundRepository;
    private final CampaignRepository campaignRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final LeadRepository leadRepository;
    private final ContactSuppressionRepository suppressionRepository;
    private final ActivityRepository activityRepository;
    private final CampaignNotificationService notificationService;
    private final CampaignAuditService auditService;
    private final DuplicateMatchingService matchingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Set<String> OPT_OUT_KEYWORDS = Set.of(
            "STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT", "REMOVE", "CANCEL", "BLOCK");

    /**
     * Parses and processes incoming webhook payload from Meta WhatsApp API.
     */
    @Transactional
    public void processWebhook(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode entryArray = root.path("entry");
            if (!entryArray.isArray()) return;

            for (JsonNode entry : entryArray) {
                JsonNode changesArray = entry.path("changes");
                if (!changesArray.isArray()) continue;

                for (JsonNode change : changesArray) {
                    JsonNode value = change.path("value");

                    // 1. Process delivery / read / failure statuses (FR-14)
                    JsonNode statuses = value.path("statuses");
                    if (statuses.isArray()) {
                        for (JsonNode statusNode : statuses) {
                            processStatusCallback(statusNode);
                        }
                    }

                    // 2. Process inbound messages / replies (FR-20, FR-21, FR-22)
                    JsonNode messages = value.path("messages");
                    if (messages.isArray()) {
                        for (JsonNode msgNode : messages) {
                            processInboundMessage(msgNode);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to process WhatsApp webhook payload: {}", e.getMessage(), e);
        }
    }

    /**
     * Updates message delivery/read/failure states without regression (BR-05).
     */
    private void processStatusCallback(JsonNode statusNode) {
        String wamid = statusNode.path("id").asText();
        String statusStr = statusNode.path("status").asText(); // "sent", "delivered", "read", "failed"
        long timestampSec = statusNode.path("timestamp").asLong(System.currentTimeMillis() / 1000);
        LocalDateTime eventTime = LocalDateTime.ofInstant(Instant.ofEpochSecond(timestampSec), ZoneId.systemDefault());

        Optional<CampaignMessage> msgOpt = messageRepository.findByProviderMessageId(wamid);
        if (msgOpt.isEmpty()) {
            log.debug("Webhook status callback for unknown message ID: {}", wamid);
            return;
        }

        CampaignMessage message = msgOpt.get();
        MessageStatus currentStatus = MessageStatus.fromString(message.getStatus());
        MessageStatus nextStatus = MessageStatus.fromString(statusStr);

        if (nextStatus == null) return;

        // Ensure status progression only advances (never regresses, BR-05)
        if (!MessageStatus.canAdvanceTo(currentStatus, nextStatus)) {
            log.debug("Skipping out-of-order webhook transition for message {}: {} -> {}",
                    message.getId(), currentStatus, nextStatus);
            return;
        }

        message.setStatus(nextStatus.getValue());
        CampaignRound round = message.getRound();
        Campaign campaign = round != null ? round.getCampaign() : null;

        if (nextStatus == MessageStatus.DELIVERED) {
            message.setDeliveredAt(eventTime);
            if (round != null) {
                round.setDeliveredCount((round.getDeliveredCount() != null ? round.getDeliveredCount() : 0) + 1);
            }
            if (campaign != null) {
                campaign.setDeliveredCount((campaign.getDeliveredCount() != null ? campaign.getDeliveredCount() : 0) + 1);
            }
        } else if (nextStatus == MessageStatus.READ) {
            message.setReadAt(eventTime);
            if (round != null) {
                round.setReadCount((round.getReadCount() != null ? round.getReadCount() : 0) + 1);
            }
            if (campaign != null) {
                campaign.setReadCount((campaign.getReadCount() != null ? campaign.getReadCount() : 0) + 1);
            }
        } else if (nextStatus == MessageStatus.FAILED) {
            message.setFailedAt(eventTime);
            JsonNode errors = statusNode.path("errors");
            if (errors.isArray() && errors.size() > 0) {
                message.setErrorCode(errors.get(0).path("code").asText());
                message.setErrorMessage(errors.get(0).path("title").asText());
            }
        }

        messageRepository.save(message);
        if (round != null) roundRepository.save(round);
        if (campaign != null) campaignRepository.save(campaign);

        log.debug("Message {} ({}) updated to {}", message.getId(), wamid, nextStatus);
    }

    /**
     * Handles inbound contact messages, opt-out keywords, and reply pauses (FR-20, FR-21, FR-22).
     */
    private void processInboundMessage(JsonNode msgNode) {
        String fromPhone = msgNode.path("from").asText();
        String msgType = msgNode.path("type").asText("text");
        String messageBody = "";

        if ("text".equalsIgnoreCase(msgType)) {
            messageBody = msgNode.path("text").path("body").asText();
        } else if ("button".equalsIgnoreCase(msgType)) {
            messageBody = msgNode.path("button").path("text").asText();
        }

        String normalizedPhone = PhoneNormalizationUtil.normalize(fromPhone);
        String trimmedBody = messageBody.trim();
        String upperBody = trimmedBody.toUpperCase();

        // 1. Check for Opt-Out Keywords (FR-22)
        if (OPT_OUT_KEYWORDS.contains(upperBody)) {
            handleOptOut(normalizedPhone, upperBody);
            return;
        }

        // 2. Normal reply received -> match lead & campaign membership
        handleReply(normalizedPhone, trimmedBody);
    }

    private void handleOptOut(String phone, String keyword) {
        // Record in suppression list
        if (!suppressionRepository.existsByPhone(phone)) {
            ContactSuppression suppression = new ContactSuppression();
            suppression.setPhone(phone);
            suppression.setReason("OPT_OUT");
            suppression.setScope("GLOBAL");
            suppression.setSource("WEBHOOK");
            suppression.setNotes("Opt-out keyword received: " + keyword);
            suppressionRepository.save(suppression);
        }

        // Update any matching CRM Leads
        DuplicateMatchingService.MatchResult match = matchingService.matchByPhone(phone);
        if (match.isMatched() && match.getMatchedLead() != null) {
            Lead lead = match.getMatchedLead();
            lead.setOptedOut(true);
            lead.setOptedOutAt(LocalDateTime.now());
            leadRepository.save(lead);

            // Update all active campaign memberships for this lead to OPTED_OUT
            List<CampaignMembership> memberships = membershipRepository.findByLeadId(lead.getId());
            for (CampaignMembership m : memberships) {
                m.setEligibilityStatus(MembershipStatus.OPTED_OUT.getValue());
                m.setPauseReason("OPT_OUT_KEYWORD");
                m.setPausedAt(LocalDateTime.now());
                membershipRepository.save(m);

                notificationService.notifyOptOut(m.getCampaign(), phone, keyword);
                auditService.logMembership(m.getCampaign().getId(), m.getId(), lead.getId(),
                        CampaignAuditAction.LEAD_OPTED_OUT.getValue(), "Opt-out keyword: " + keyword, "SYSTEM");
            }
        }

        log.info("Contact {} opted out via keyword '{}'. Added to global suppression.", phone, keyword);
    }

    private void handleReply(String phone, String replyText) {
        // Find campaign membership by phone
        List<CampaignMembership> memberships = membershipRepository.findByPhoneAndEligibilityStatus(
                phone, MembershipStatus.ELIGIBLE.getValue());

        if (memberships.isEmpty()) {
            // Also search all memberships for this phone
            DuplicateMatchingService.MatchResult match = matchingService.matchByPhone(phone);
            if (match.isMatched() && match.getMatchedLead() != null) {
                memberships = membershipRepository.findByLeadId(match.getMatchedLead().getId());
            }
        }

        for (CampaignMembership membership : memberships) {
            Campaign campaign = membership.getCampaign();
            Lead lead = membership.getLead();

            // Set reply flags
            membership.setHasReplied(true);
            membership.setRepliedAt(LocalDateTime.now());

            // Pause on reply (FR-21, BR-07)
            membership.setEligibilityStatus(MembershipStatus.PAUSED.getValue());
            membership.setPauseReason("REPLIED");
            membership.setPausedAt(LocalDateTime.now());
            membership.setPausedByAdminEmail("SYSTEM_WEBHOOK");
            membershipRepository.save(membership);

            // Update campaign responded count
            if (campaign != null) {
                campaign.setRespondedCount((campaign.getRespondedCount() != null ? campaign.getRespondedCount() : 0) + 1);
                campaignRepository.save(campaign);
            }

            // Create inbound activity record on lead timeline (FR-20)
            if (lead != null) {
                Activity activity = new Activity();
                activity.setLead(lead);
                activity.setCompany(lead.getCompany());
                activity.setContact(lead.getContact());
                activity.setActivityType(ActivityType.WHATSAPP_INBOUND.getValue());
                activity.setSubject("WhatsApp Reply: " + (campaign != null ? campaign.getName() : "Campaign"));
                activity.setNotes(replyText);
                activity.setActivityDate(LocalDateTime.now());
                activity.setStatus("completed");
                activity.setCompletedAt(LocalDateTime.now());
                activity.setCampaignId(campaign != null ? campaign.getId() : null);
                activity.setMessageDirection("INBOUND");
                activity.setPerformedByAdmin(lead.getOwnerAdmin());
                activityRepository.save(activity);

                // Notify assigned sales executive
                notificationService.notifyContactReply(lead, campaign, replyText);
            }

            auditService.logMembership(campaign != null ? campaign.getId() : null, membership.getId(),
                    lead != null ? lead.getId() : null,
                    CampaignAuditAction.REPLY_RECEIVED.getValue(), "Reply text: " + replyText, "WEBHOOK");

            log.info("Reply received from {} for campaign {}. Contact paused.", phone, campaign != null ? campaign.getName() : "unknown");
        }
    }
}
