package com.bentork.ev_system.model;

import java.time.LocalDate;
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
 * Represents a marketing campaign (post, offer, newsletter)
 * sent to a targeted audience of {@link SalesCompany} contacts.
 */
@Entity
@Table(name = "campaigns", indexes = {
        @Index(name = "idx_campaign_status", columnList = "status"),
        @Index(name = "idx_campaign_type", columnList = "type"),
        @Index(name = "idx_campaign_scheduled", columnList = "scheduledDate")
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
    private String type; // "POST", "OFFER", "NEWSLETTER"

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDate scheduledDate;

    @Column(nullable = false)
    private String status; // "DRAFT", "SCHEDULED", "SENT", "COMPLETED"

    private Integer totalRecipients = 0;

    private Integer sentCount = 0;

    private Integer openedCount = 0;

    private Integer respondedCount = 0;

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
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
