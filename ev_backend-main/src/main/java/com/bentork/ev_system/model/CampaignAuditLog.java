package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Audit trail for all material changes and sending actions in the
 * WhatsApp campaign system (FR-26, BR-09).
 *
 * Records who created/changed campaigns, templates, schedules,
 * assignments, sending actions and suppression decisions.
 */
@Entity
@Table(name = "campaign_audit_logs", indexes = {
        @Index(name = "idx_audit_campaign", columnList = "campaignId"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_performer", columnList = "performedBy")
})
@Getter
@Setter
public class CampaignAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long campaignId;
    private Long roundId;
    private Long membershipId;
    private Long leadId;

    @Column(nullable = false)
    private String action;                  // CampaignAuditAction enum value

    @Column(columnDefinition = "TEXT")
    private String details;                 // JSON with before/after or contextual data

    @Column(nullable = false)
    private String performedBy;             // Admin email or "SYSTEM"

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
