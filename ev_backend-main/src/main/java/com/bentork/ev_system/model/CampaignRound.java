package com.bentork.ev_system.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

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
 * Represents a single messaging round within a {@link Campaign}.
 *
 * Each campaign can have N rounds, each with its own template, schedule,
 * send mode, and per-round delivery statistics (FR-08, FR-10).
 */
@Entity
@Table(name = "campaign_rounds", indexes = {
        @Index(name = "idx_round_campaign", columnList = "campaign_id"),
        @Index(name = "idx_round_status", columnList = "status"),
        @Index(name = "idx_round_planned_date", columnList = "plannedDate"),
        @Index(name = "idx_round_number", columnList = "campaign_id, roundNumber")
})
@Getter
@Setter
public class CampaignRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(nullable = false)
    private Integer roundNumber;            // 1, 2, 3...

    @Column(nullable = false)
    private String templateName;            // WhatsApp template name or identifier

    @Column(columnDefinition = "TEXT")
    private String templateBody;            // Resolved message body with placeholders

    private Long templateId;                // FK to WhatsAppTemplate if using managed templates

    private String templateStatus;          // "APPROVED", "PENDING", "REJECTED" (from provider)

    private LocalDate plannedDate;
    private LocalTime plannedTime;
    private String timezone = "Asia/Kolkata";

    private String sendMode = "MANUAL";     // "MANUAL" or "AUTOMATIC"

    // Round status: PENDING, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, PAUSED
    @Column(nullable = false)
    private String status = "PENDING";

    // ==================== Per-Round Aggregate Counts ====================

    private Integer eligibleCount = 0;
    private Integer sentCount = 0;
    private Integer deliveredCount = 0;
    private Integer readCount = 0;
    private Integer failedCount = 0;
    private Integer skippedCount = 0;

    // ==================== Execution Tracking ====================

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String triggeredByAdminEmail;

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
            this.status = "PENDING";
        }
        if (this.timezone == null) {
            this.timezone = "Asia/Kolkata";
        }
        if (this.sendMode == null) {
            this.sendMode = "MANUAL";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
