package com.bentork.ev_system.service;

import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ReceiptRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Handles session reminder notifications before session completion.
 *
 * Two types of reminders:
 * 1. TIME-BASED (Plan sessions): Fires 10 minutes before plan duration ends.
 * 2. kWh-BASED (Custom sessions): Fires when 90% of selectedKwh is consumed.
 *
 * Uses the reminderSent flag on Session to guarantee at-most-once delivery.
 */
@Slf4j
@Service
public class SessionReminderService {

    private static final int REMINDER_BEFORE_END_MINUTES = 10;
    private static final double KWH_REMINDER_THRESHOLD = 0.90;

    private final SessionRepository sessionRepository;
    private final ReceiptRepository receiptRepository;
    private final IUserNotificationService userNotificationService;
    private final PushNotificationService pushNotificationService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(8);

    public SessionReminderService(
            SessionRepository sessionRepository,
            ReceiptRepository receiptRepository,
            IUserNotificationService userNotificationService,
            PushNotificationService pushNotificationService) {
        this.sessionRepository = sessionRepository;
        this.receiptRepository = receiptRepository;
        this.userNotificationService = userNotificationService;
        this.pushNotificationService = pushNotificationService;
    }

    // ===================== TIME-BASED REMINDER (Plan Sessions) =====================

    /**
     * Schedules a reminder notification for a plan-based session.
     * The reminder fires (durationMin - 10) minutes after session start.
     * If the plan is shorter than 10 minutes, the reminder fires immediately.
     *
     * @param sessionId   The session ID
     * @param durationMin The plan's total duration in minutes
     */
    public void scheduleTimeReminder(Long sessionId, int durationMin) {
        int reminderDelayMin = Math.max(durationMin - REMINDER_BEFORE_END_MINUTES, 0);

        scheduler.schedule(() -> {
            try {
                sendTimeReminder(sessionId, durationMin);
            } catch (Exception e) {
                log.error("Failed to send time reminder for session {}: {}", sessionId, e.getMessage(), e);
            }
        }, reminderDelayMin, TimeUnit.MINUTES);

        log.info("Scheduled time reminder: sessionId={}, fires in {} min (plan={}min)",
                sessionId, reminderDelayMin, durationMin);
    }

    /**
     * Sends the actual time-based reminder notification.
     * Guards against duplicate sends and inactive sessions.
     */
    private void sendTimeReminder(Long sessionId, int durationMin) {
        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            log.warn("Time reminder: session {} not found, skipping", sessionId);
            return;
        }

        if (!SessionStatus.ACTIVE.matches(session.getStatus())) {
            log.info("Time reminder: session {} is not active (status={}), skipping",
                    sessionId, session.getStatus());
            return;
        }

        if (Boolean.TRUE.equals(session.getReminderSent())) {
            log.debug("Time reminder: session {} already reminded, skipping", sessionId);
            return;
        }

        int remainingMin = Math.min(REMINDER_BEFORE_END_MINUTES, durationMin);
        String title = "⚡ Session Ending Soon";
        String message = "Your charging session will end in " + remainingMin
                + " minutes. Plan accordingly!";

        // In-app notification (persisted to DB)
        userNotificationService.createNotification(
                session.getUser().getId(), title, message, "SESSION_REMINDER");

        // FCM push notification (sent to device)
        String fcmToken = session.getUser().getFcmToken();
        pushNotificationService.sendNotificationWithData(fcmToken, title, message,
                Map.of("type", "SESSION_REMINDER",
                        "sessionId", String.valueOf(sessionId)));

        // Mark as sent to prevent duplicates
        session.setReminderSent(true);
        sessionRepository.save(session);

        log.info("Time reminder sent: sessionId={}, remainingMin={}, userId={}",
                sessionId, remainingMin, session.getUser().getId());
    }

    // ===================== kWh-BASED REMINDER (Custom Sessions) =====================

    /**
     * Checks if a kWh-based session has reached the 90% threshold and sends
     * a reminder notification if so. Called on every MeterValues update.
     *
     * @param sessionId  The session ID
     * @param currentKwh The current energy consumed in kWh
     */
    public void checkAndSendKwhReminder(Long sessionId, double currentKwh) {
        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return;
        }

        if (!SessionStatus.ACTIVE.matches(session.getStatus())) {
            return;
        }

        if (Boolean.TRUE.equals(session.getReminderSent())) {
            return;
        }

        Receipt receipt = receiptRepository.findBySession(session).orElse(null);
        if (receipt == null || receipt.getSelectedKwh() == null) {
            return;
        }

        double targetKwh = receipt.getSelectedKwh().doubleValue();
        double threshold = targetKwh * KWH_REMINDER_THRESHOLD;

        if (currentKwh >= threshold) {
            double remaining = Math.max(targetKwh - currentKwh, 0);
            String title = "⚡ Charging Almost Complete";
            String message = String.format(
                    "You've used %.2f kWh of %.2f kWh (90%%). Only %.2f kWh remaining!",
                    currentKwh, targetKwh, remaining);

            // In-app notification (persisted to DB)
            userNotificationService.createNotification(
                    session.getUser().getId(), title, message, "SESSION_REMINDER");

            // FCM push notification (sent to device)
            String fcmToken = session.getUser().getFcmToken();
            pushNotificationService.sendNotificationWithData(fcmToken, title, message,
                    Map.of("type", "SESSION_REMINDER",
                            "sessionId", String.valueOf(sessionId)));

            // Mark as sent to prevent duplicates
            session.setReminderSent(true);
            sessionRepository.save(session);

            log.info("kWh reminder sent: sessionId={}, currentKwh={}, targetKwh={}, threshold={}, userId={}",
                    sessionId, currentKwh, targetKwh, threshold, session.getUser().getId());
        }
    }

    // ===================== SOC-BASED REMINDER (DC Sessions) =====================

    /**
     * Checks if a DC session has reached 100% SoC and sends
     * a fully charged notification if so. Called on every MeterValues update containing SoC.
     *
     * @param sessionId  The session ID
     * @param currentSoc The current State of Charge (SoC)
     */
    public void checkAndSendFullyChargedNotification(Long sessionId, double currentSoc) {
        if (currentSoc < 100.0) {
            return;
        }

        Session session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return;
        }

        if (!SessionStatus.ACTIVE.matches(session.getStatus())) {
            return;
        }

        if (Boolean.TRUE.equals(session.getFullyChargedNotified())) {
            return;
        }

        String title = "🔋 Fully Charged";
        String message = "Your EV is fully charged at 100%. Please move your vehicle to avoid idle fees!";

        // In-app notification (persisted to DB)
        userNotificationService.createNotification(
                session.getUser().getId(), title, message, "FULLY_CHARGED");

        // FCM push notification (sent to device)
        String fcmToken = session.getUser().getFcmToken();
        pushNotificationService.sendNotificationWithData(fcmToken, title, message,
                Map.of("type", "FULLY_CHARGED",
                        "sessionId", String.valueOf(sessionId)));

        // Mark as sent to prevent duplicates
        session.setFullyChargedNotified(true);
        sessionRepository.save(session);

        log.info("Fully charged notification sent: sessionId={}, soc={}, userId={}",
                sessionId, currentSoc, session.getUser().getId());
    }
}
