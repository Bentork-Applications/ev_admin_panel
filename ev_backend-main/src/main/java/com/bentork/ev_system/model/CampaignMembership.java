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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents the association between a {@link Lead} and a {@link Campaign}.
 *
 * Each lead can belong to multiple campaigns (FR-24), but each lead/campaign
 * relationship must be unique (BR-02). The membership tracks the lead's
 * eligibility status, current round progress, and pause/suppression state
 * within that specific campaign.
 *
 * Core design principle (BR-01): a campaign lead links to the canonical CRM
 * lead record — there is no separate disconnected lead profile.
 */
@Entity
@Table(name = "campaign_memberships", indexes = {
        @Index(name = "idx_cm_campaign", columnList = "campaign_id"),
        @Index(name = "idx_cm_lead", columnList = "lead_id"),
        @Index(name = "idx_cm_status", columnList = "eligibilityStatus"),
        @Index(name = "idx_cm_owner", columnList = "owner_admin_id"),
        @Index(name = "idx_cm_next_due", columnList = "nextDueDate")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_campaign_lead", columnNames = {"campaign_id", "lead_id"})
})
@Getter
@Setter
public class CampaignMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_admin_id")
    private Admin ownerAdmin;               // Assigned sales executive

    // ELIGIBLE, PAUSED, OPTED_OUT, CONVERTED, DISQUALIFIED, SUPPRESSED
    @Column(nullable = false)
    private String eligibilityStatus = "ELIGIBLE";

    private Integer currentRound = 0;       // Last completed round number
    private LocalDate nextDueDate;

    // ==================== Pause / Suppression ====================

    private String pauseReason;             // "REPLIED", "OPT_OUT", "MANUAL", "CONVERTED"
    private LocalDateTime pausedAt;
    private String pausedByAdminEmail;

    // ==================== Reply Tracking ====================

    @Column(columnDefinition = "boolean default false")
    private boolean hasReplied = false;
    private LocalDateTime repliedAt;

    // ==================== Denormalized Contact Info ====================

    private String phone;                   // Normalized phone for fast dispatch
    private String contactName;             // Display name

    // ==================== Audit ====================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.eligibilityStatus == null) {
            this.eligibilityStatus = "ELIGIBLE";
        }
        if (this.currentRound == null) {
            this.currentRound = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
