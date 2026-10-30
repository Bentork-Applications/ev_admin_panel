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
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a contact that has been suppressed from receiving
 * campaign messages (FR-22).
 *
 * Suppression can be global (blocks all campaigns) or campaign-scoped.
 * Sources include: webhook opt-out, manual admin action, or import exclusion.
 *
 * Once suppressed, the eligibility engine checks this table before
 * every message submission to prevent sending to opted-out contacts.
 */
@Entity
@Table(name = "contact_suppressions", indexes = {
        @Index(name = "idx_suppression_phone", columnList = "phone"),
        @Index(name = "idx_suppression_lead", columnList = "lead_id"),
        @Index(name = "idx_suppression_scope", columnList = "scope"),
        @Index(name = "idx_suppression_reason", columnList = "reason")
})
@Getter
@Setter
public class ContactSuppression {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String phone;                   // Normalized phone number

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;                      // Optional link to lead record

    @Column(nullable = false)
    private String reason;                  // "OPT_OUT", "DNC", "COMPLAINT", "MANUAL", "BOUNCED"

    @Column(nullable = false)
    private String scope = "GLOBAL";        // "GLOBAL" or "CAMPAIGN_{id}"

    private String source;                  // "WEBHOOK", "MANUAL", "IMPORT", "SYSTEM"

    private String addedByAdminEmail;       // Who added this suppression (null if automated)

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime suppressedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.suppressedAt == null) {
            this.suppressedAt = LocalDateTime.now();
        }
        if (this.scope == null) {
            this.scope = "GLOBAL";
        }
    }
}
