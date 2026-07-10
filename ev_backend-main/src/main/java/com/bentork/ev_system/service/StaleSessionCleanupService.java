package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

import com.bentork.ev_system.service.interfaces.IAdminNotificationService;

import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ReceiptRepository;
import com.bentork.ev_system.repository.SessionRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled cleanup service that automatically fails sessions
 * stuck in "initiated" status for more than 5 minutes.
 *
 * This prevents ghost/orphaned sessions from blocking chargers
 * when the physical charger never responds to RemoteStartTransaction
 * (e.g., charger offline, network issues, server restart).
 *
 * Runs every 60 seconds.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StaleSessionCleanupService {

    private static final int STALE_TIMEOUT_MINUTES = 5;

    private final SessionRepository sessionRepository;

    private final ReceiptRepository receiptRepository;

    private final IWalletTransactionService walletTransactionService;

    private final IUserNotificationService userNotificationService;

    private final IAdminNotificationService adminNotificationService;

    /**
     * Runs every 60 seconds to find and fail stale "initiated" sessions.
     * A session is considered stale if it has been in "initiated" status
     * for more than 5 minutes without transitioning to "active".
     */
    @Scheduled(fixedRate = 60000) // every 60 seconds
    @Transactional
    public void cleanupStaleSessions() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusMinutes(STALE_TIMEOUT_MINUTES);

            List<Session> staleSessions = sessionRepository.findByStatusAndCreatedAtBefore(
                    SessionStatus.INITIATED.getValue(), cutoff);

            if (staleSessions.isEmpty()) {
                return; // Nothing to clean up — skip logging to reduce noise
            }

            log.info("Found {} stale initiated session(s) older than {} minutes. Cleaning up...",
                    staleSessions.size(), STALE_TIMEOUT_MINUTES);

            for (Session session : staleSessions) {
                try {
                    failStaleSession(session);
                } catch (Exception e) {
                    // Log but continue processing other stale sessions
                    log.error("Failed to clean up stale session {}: {}",
                            session.getId(), e.getMessage(), e);
                }
            }

        } catch (Exception e) {
            log.error("Stale session cleanup job encountered an error: {}", e.getMessage(), e);
        }
    }

    /**
     * Marks a single stale session as FAILED, refunds the user if applicable,
     * and sends notifications.
     */
    public void failStaleSession(Session session) {
        log.info("Failing stale session: sessionId={}, userId={}, chargerId={}, createdAt={}",
                session.getId(),
                session.getUser().getId(),
                session.getCharger().getId(),
                session.getCreatedAt());

        // 1. Mark session as FAILED
        session.setStatus(SessionStatus.FAILED.getValue());
        session.setEndTime(LocalDateTime.now());
        sessionRepository.save(session);

        // 2. Refund user if a paid receipt is linked
        Receipt receipt = receiptRepository.findBySession(session).orElse(null);
        if (receipt != null && receipt.getAmount() != null
                && receipt.getAmount().compareTo(BigDecimal.ZERO) > 0) {

            // Double-refund guard
            if (session.getRefundStatus() == null || "INSTANT_REFUNDED".equals(session.getRefundStatus())) {
                walletTransactionService.credit(
                        session.getUser().getId(),
                        session.getId(),
                        receipt.getAmount(),
                        "Refund: Session timed out (charger did not respond)");

                session.setRefundStatus("FULL_REFUNDED");
                sessionRepository.save(session);
                
                log.info("Refunded ₹{} to userId={} for stale session {}",
                        receipt.getAmount(), session.getUser().getId(), session.getId());
            } else {
                log.warn("Duplicate full refund attempt blocked for stale session {}, refundStatus={}",
                        session.getId(), session.getRefundStatus());
            }
        }

        // 3. Notify user
        userNotificationService.createNotification(
                session.getUser().getId(),
                "Session Timed Out",
                "Your charging session could not be started — the charger did not respond within "
                        + STALE_TIMEOUT_MINUTES + " minutes. Any amount paid has been refunded to your wallet.",
                "ERROR");

        // 4. Notify admin
        adminNotificationService.createSystemNotification(
                "Stale session auto-failed: sessionId=" + session.getId()
                        + ", chargerId=" + session.getCharger().getId()
                        + ", userId=" + session.getUser().getId()
                        + ". Charger did not respond within " + STALE_TIMEOUT_MINUTES + " minutes.",
                "STALE_SESSION_CLEANUP");

        log.info("✅ Stale session {} successfully cleaned up and user refunded", session.getId());
    }
}
