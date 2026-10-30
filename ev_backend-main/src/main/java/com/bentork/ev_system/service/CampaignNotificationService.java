package com.bentork.ev_system.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.AdminNotification;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.AdminNotificationRepository;
import com.bentork.ev_system.repository.AdminRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for sending notifications and reminders for campaign events.
 * Implements FR-17 and BRD Section 11 (Notifications and Reminders).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignNotificationService {

    private final AdminNotificationRepository notificationRepository;
    private final AdminRepository adminRepository;
    private final PushNotificationService pushService;

    /**
     * Notify campaign owner that a round is due soon or due now.
     */
    @Transactional
    public void notifyRoundDue(Campaign campaign, CampaignRound round, boolean isOverdue) {
        Admin owner = campaign.getOwnerAdmin();
        if (owner == null) return;

        String type = isOverdue ? "CAMPAIGN_ROUND_OVERDUE" : "CAMPAIGN_ROUND_DUE";
        String title = isOverdue ? "Campaign Round Overdue" : "Campaign Round Due";
        String message = String.format("Campaign '%s' Round %d is %s (Planned: %s %s)",
                campaign.getName(),
                round.getRoundNumber(),
                isOverdue ? "OVERDUE" : "due for dispatch",
                round.getPlannedDate(),
                round.getPlannedTime() != null ? round.getPlannedTime() : "");

        sendNotification(owner, type, title, message);
    }

    /**
     * Notify sales executive when their assigned lead responds to a WhatsApp message (FR-20).
     */
    @Transactional
    public void notifyContactReply(Lead lead, Campaign campaign, String replySnippet) {
        Admin owner = lead.getOwnerAdmin() != null ? lead.getOwnerAdmin() : campaign.getOwnerAdmin();
        if (owner == null) return;

        String type = "CAMPAIGN_LEAD_REPLIED";
        String title = "WhatsApp Lead Reply Received";
        String message = String.format("Lead %s (%s) replied to Campaign '%s': \"%s\"",
                lead.getLeadNumber(),
                lead.getPhone() != null ? lead.getPhone() : "contact",
                campaign.getName(),
                replySnippet != null ? (replySnippet.length() > 60 ? replySnippet.substring(0, 57) + "..." : replySnippet) : "");

        sendNotification(owner, type, title, message);
    }

    /**
     * Notify admin when a contact opts out or is suppressed (FR-22).
     */
    @Transactional
    public void notifyOptOut(Campaign campaign, String phone, String reason) {
        Admin owner = campaign.getOwnerAdmin();
        if (owner == null) return;

        String type = "CAMPAIGN_OPT_OUT";
        String title = "WhatsApp Contact Opted Out";
        String message = String.format("Contact %s opted out from Campaign '%s' (Reason: %s). Future sends blocked.",
                phone, campaign.getName(), reason);

        sendNotification(owner, type, title, message);
    }

    /**
     * Notify owner that all rounds of a campaign have been completed.
     */
    @Transactional
    public void notifyCampaignCompleted(Campaign campaign) {
        Admin owner = campaign.getOwnerAdmin();
        if (owner == null) return;

        String type = "CAMPAIGN_COMPLETED";
        String title = "Campaign Completed";
        String message = String.format("Campaign '%s' completed all rounds. Sent: %d, Delivered: %d, Read: %d, Replies: %d",
                campaign.getName(),
                campaign.getSentCount() != null ? campaign.getSentCount() : 0,
                campaign.getDeliveredCount() != null ? campaign.getDeliveredCount() : 0,
                campaign.getReadCount() != null ? campaign.getReadCount() : 0,
                campaign.getRespondedCount() != null ? campaign.getRespondedCount() : 0);

        sendNotification(owner, type, title, message);
    }

    private void sendNotification(Admin admin, String type, String title, String message) {
        try {
            AdminNotification notification = new AdminNotification();
            notification.setAdmin(admin);
            notification.setType(type);
            notification.setMessage(message);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notification);

            if (admin.getFcmToken() != null && !admin.getFcmToken().trim().isEmpty()) {
                pushService.sendNotification(admin.getFcmToken(), title, message);
            }
        } catch (Exception e) {
            log.error("Failed to send notification to admin {}: {}", admin.getEmail(), e.getMessage());
        }
    }
}
