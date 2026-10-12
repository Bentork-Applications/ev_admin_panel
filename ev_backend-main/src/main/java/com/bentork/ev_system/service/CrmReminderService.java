package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.enums.LeadStatus;
import com.bentork.ev_system.enums.QuotationStatus;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.AdminNotification;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.Quotation;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AdminNotificationRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.QuotationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Scheduled jobs for the Sales CRM:
 * 
 * 1. Follow-up Reminders — Notifies sales admins about leads/activities
 *    with follow-ups due today or overdue.
 * 2. Quotation Expiry — Automatically marks SENT quotations as EXPIRED
 *    when past their validUntil date.
 * 
 * Follows the same pattern as existing scheduled services:
 * {@link MaintenanceSchedulerService}, {@link SlotBookingCleanupService},
 * {@link StaleSessionCleanupService}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CrmReminderService {

    private final LeadRepository leadRepository;
    private final ActivityRepository activityRepository;
    private final QuotationRepository quotationRepository;
    private final AdminNotificationRepository notificationRepository;
    private final PushNotificationService pushService;

    // ==================== FOLLOW-UP REMINDERS ====================

    /**
     * Runs every day at 9:00 AM (weekdays) to send follow-up reminders.
     * 
     * Checks:
     * 1. Leads with nextFollowUpDate = today → notify the owner admin
     * 2. Activities with followUpDate = today → notify the performing admin
     * 3. Overdue leads (nextFollowUpDate < today) → escalation notification
     */
    @Scheduled(cron = "0 0 9 * * MON-FRI") // 9 AM weekdays
    public void sendFollowUpReminders() {
        log.info("🔔 CRM Reminder Job: Checking follow-ups for today...");

        LocalDate today = LocalDate.now();
        int remindersSent = 0;

        // 1. Leads with follow-up today
        List<String> terminalStatuses = Arrays.asList(
                LeadStatus.CONVERTED.getValue(), LeadStatus.LOST.getValue());

        List<Lead> todayLeads = leadRepository.findByNextFollowUpDateBetween(today, today);
        for (Lead lead : todayLeads) {
            if (lead.getOwnerAdmin() != null && !terminalStatuses.contains(lead.getStatus())) {
                String message = "📞 Follow-up today: " + lead.getTitle()
                        + " (Lead: " + lead.getLeadNumber() + ")";
                createNotification(lead.getOwnerAdmin(), message, "CRM_FOLLOW_UP");
                remindersSent++;
            }
        }

        // 2. Activities with follow-up today
        List<Activity> todayActivities = activityRepository
                .findByFollowUpDateBeforeAndFollowUpDateIsNotNull(today.plusDays(1));
        for (Activity activity : todayActivities) {
            if (activity.getPerformedByAdmin() != null
                    && activity.getFollowUpDate() != null
                    && activity.getFollowUpDate().equals(today)) {
                String subject = activity.getSubject() != null ? activity.getSubject() : "Activity";
                String message = "📋 Follow-up due today: " + subject;
                createNotification(activity.getPerformedByAdmin(), message, "CRM_FOLLOW_UP");
                remindersSent++;
            }
        }

        // 3. Overdue leads (past due, not yet followed up)
        List<Lead> overdueLeads = leadRepository
                .findByNextFollowUpDateBeforeAndStatusNotIn(today, terminalStatuses);
        for (Lead lead : overdueLeads) {
            if (lead.getOwnerAdmin() != null) {
                long daysOverdue = today.toEpochDay() - lead.getNextFollowUpDate().toEpochDay();
                String message = "⚠️ OVERDUE (" + daysOverdue + " days): " + lead.getTitle()
                        + " (Lead: " + lead.getLeadNumber() + ")";
                createNotification(lead.getOwnerAdmin(), message, "CRM_OVERDUE");
                remindersSent++;
            }
        }

        log.info("🔔 CRM Reminder Job complete: {} reminders sent", remindersSent);
    }

    // ==================== QUOTATION EXPIRY ====================

    /**
     * Runs every day at 10:00 AM to flag expired quotations.
     * 
     * Finds all SENT quotations where validUntil < today and updates their
     * status to EXPIRED. Notifies the creator admin.
     */
    @Scheduled(cron = "0 0 10 * * *") // 10 AM daily
    public void flagExpiredQuotations() {
        log.info("📄 Quotation Expiry Job: Checking for expired quotations...");

        LocalDate today = LocalDate.now();
        List<Quotation> expiredQuotations = quotationRepository
                .findByStatusAndValidUntilBefore(QuotationStatus.SENT.getValue(), today);

        int expiredCount = 0;
        for (Quotation quotation : expiredQuotations) {
            quotation.setStatus(QuotationStatus.EXPIRED.getValue());
            quotationRepository.save(quotation);
            expiredCount++;

            log.info("Quotation {} expired (valid until: {})",
                    quotation.getQuoteNumber(), quotation.getValidUntil());
        }

        if (expiredCount > 0) {
            log.info("📄 Quotation Expiry Job complete: {} quotations marked as EXPIRED", expiredCount);
        } else {
            log.debug("📄 Quotation Expiry Job: No expired quotations found");
        }
    }

    // ==================== HELPERS ====================

    /**
     * Creates an AdminNotification for a specific admin and optionally
     * sends a push notification via FCM.
     */
    private void createNotification(Admin admin, String message, String type) {
        try {
            AdminNotification notification = new AdminNotification();
            notification.setAdmin(admin);
            notification.setMessage(message);
            notification.setType(type);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notification);

            // Send FCM push notification if token is available
            sendPushSafely(admin, "Sales CRM", message);

        } catch (Exception e) {
            log.error("Failed to create CRM notification for admin {}: {}",
                    admin.getId(), e.getMessage());
        }
    }

    /**
     * Sends FCM push notification without blocking or crashing.
     * Mirrors the pattern from {@link AdminNotificationService#sendPushSafely}.
     */
    private void sendPushSafely(Admin admin, String title, String body) {
        try {
            String token = admin.getFcmToken();
            if (token != null && !token.trim().isEmpty()) {
                pushService.sendNotification(token, title, body);
                log.debug("CRM push sent to admin: {}", admin.getId());
            }
        } catch (Exception e) {
            log.error("Failed to send CRM push to admin {}: {}", admin.getId(), e.getMessage());
        }
    }
}
