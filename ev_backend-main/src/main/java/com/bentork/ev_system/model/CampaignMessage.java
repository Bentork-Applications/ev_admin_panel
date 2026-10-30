package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a single WhatsApp message instance sent (or attempted) to a lead
 * for a specific campaign round.
 *
 * One record per lead per round/attempt, with retry lineage tracking.
 * Uses an idempotency key to prevent duplicate sends (BR-04, BR-06).
 *
 * Status progression is strictly forward (QUEUED→SUBMITTED→SENT→DELIVERED→READ)
 * and is designed to handle out-of-order webhook callbacks (BR-05).
 */
@Entity
@Table(name = "campaign_messages", indexes = {
        @Index(name = "idx_msg_membership", columnList = "membership_id"),
        @Index(name = "idx_msg_round", columnList = "round_id"),
        @Index(name = "idx_msg_lead", columnList = "lead_id"),
        @Index(name = "idx_msg_provider_id", columnList = "providerMessageId"),
        @Index(name = "idx_msg_status", columnList = "status"),
        @Index(name = "idx_msg_idempotency", columnList = "idempotencyKey")
})
@Getter
@Setter
public class CampaignMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id", nullable = false)
    private CampaignMembership membership;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", nullable = false)
    private CampaignRound round;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    // Idempotency key: "campaign_{cid}_round_{rid}_lead_{lid}" prevents duplicate sends
    @Column(unique = true, nullable = false)
    private String idempotencyKey;

    private String providerMessageId;       // WAMID from Meta WhatsApp API

    private String templateUsed;            // Template name/ID used for this message

    private String phone;                   // Phone number the message was sent to

    // Status: QUEUED, SUBMITTED, SENT, DELIVERED, READ, FAILED, SKIPPED, UNDELIVERABLE
    @Column(nullable = false)
    private String status = "QUEUED";

    // ==================== Error Tracking ====================

    private String errorCode;
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    // ==================== Timestamp Progression ====================

    private LocalDateTime queuedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime sentAt;           // Provider confirmed sent
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;
    private LocalDateTime failedAt;

    // ==================== Retry Tracking ====================

    @Column(columnDefinition = "int default 0")
    private Integer retryCount = 0;
    private Long parentMessageId;           // For retry lineage (points to original message)

    // ==================== Execution Context ====================

    private String triggeredBy;             // Admin email or "SYSTEM_SCHEDULER"
    private String skipReason;              // If status = SKIPPED, why

    // ==================== Audit ====================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "QUEUED";
        }
        if (this.queuedAt == null) {
            this.queuedAt = LocalDateTime.now();
        }
        if (this.retryCount == null) {
            this.retryCount = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Generate a standard idempotency key for this message.
     */
    public static String generateIdempotencyKey(Long campaignId, Long roundId, Long leadId) {
        return "campaign_" + campaignId + "_round_" + roundId + "_lead_" + leadId;
    }
}
