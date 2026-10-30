package com.bentork.ev_system.model;

import java.time.LocalDate;
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
 * Represents a marketing campaign (post, offer, newsletter, WhatsApp outreach)
 * sent to a targeted audience of {@link SalesCompany} contacts or {@link Lead} records.
 *
 * Supports multi-round WhatsApp campaigns with configurable lifecycle,
 * scheduling, and lead synchronisation (FR-01, FR-02, FR-08).
 */
@Entity
@Table(name = "campaigns", indexes = {
        @Index(name = "idx_campaign_status", columnList = "status"),
        @Index(name = "idx_campaign_type", columnList = "type"),
        @Index(name = "idx_campaign_scheduled", columnList = "scheduledDate"),
        @Index(name = "idx_campaign_owner", columnList = "owner_admin_id"),
        @Index(name = "idx_campaign_send_mode", columnList = "sendMode")
})
@Getter
@Setter
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // Campaign name

    @Column(nullable = false)
    private String type; // "POST", "OFFER", "NEWSLETTER", "WHATSAPP_OUTREACH"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String objective;               // Campaign objective description

    private LocalDate scheduledDate;

    @Column(nullable = false)
    private String channel = "EMAIL"; // "EMAIL", "WHATSAPP", "BOTH"

    private String subject; // Email subject or campaign notification title

    @Column(columnDefinition = "TEXT")
    private String messageBody; // Content with {{contactName}}, {{companyName}} placeholders

    private Long targetAudienceSegmentId; // Optional link to saved AudienceSegment

    // ==================== Lifecycle & Status (FR-02) ====================

    @Column(nullable = false)
    private String status; // "DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"

    // ==================== Campaign Owner ====================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_admin_id")
    private Admin ownerAdmin;               // Campaign owner / admin

    // ==================== Scheduling & Timezone (FR-30) ====================

    private LocalDate startDate;
    private LocalDate endDate;
    private String timezone = "Asia/Kolkata";

    // ==================== Round Tracking (FR-08) ====================

    private Integer totalRounds = 0;
    private Integer completedRounds = 0;

    // ==================== Send Mode (FR-11) ====================

    private String sendMode = "MANUAL";     // "MANUAL", "AUTOMATIC", "HYBRID"

    // ==================== Aggregate Counts ====================

    private Integer totalRecipients = 0;

    private Integer sentCount = 0;

    private Integer openedCount = 0;

    private Integer respondedCount = 0;

    private Integer deliveredCount = 0;

    private Integer readCount = 0;

    private Integer failedCount = 0;

    // ==================== Pause/Resume Tracking ====================

    private String pauseReason;
    private LocalDateTime pausedAt;
    private String pausedByAdminEmail;

    // ==================== Audit ====================

    private String createdByAdminEmail;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "DRAFT";
        }
        if (this.channel == null) {
            this.channel = "EMAIL";
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

