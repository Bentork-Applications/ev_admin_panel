package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents an approved WhatsApp message template that can be used
 * in campaign rounds (FR-09).
 *
 * Templates must be approved by the WhatsApp provider before they can
 * be used for outbound messaging. The approval status is tracked and
 * displayed to admins when configuring rounds.
 */
@Entity
@Table(name = "whatsapp_templates", indexes = {
        @Index(name = "idx_wa_template_name", columnList = "name"),
        @Index(name = "idx_wa_template_status", columnList = "approvalStatus"),
        @Index(name = "idx_wa_template_active", columnList = "active")
})
@Getter
@Setter
public class WhatsAppTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;                    // e.g., "intro_offer_v1"

    private String category;               // "MARKETING", "UTILITY"

    private String language = "en";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;                    // Template body with {{1}}, {{contactName}} etc.

    private String headerType;              // "TEXT", "IMAGE", "VIDEO", "DOCUMENT" or null
    @Column(columnDefinition = "TEXT")
    private String headerContent;

    private String footerText;

    private String providerTemplateId;      // Meta's template ID (if synced)

    @Column(nullable = false)
    private String approvalStatus = "PENDING"; // "APPROVED", "PENDING", "REJECTED"

    private String createdByAdminEmail;

    @Column(columnDefinition = "boolean default true")
    private boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.approvalStatus == null) {
            this.approvalStatus = "PENDING";
        }
        if (this.language == null) {
            this.language = "en";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
