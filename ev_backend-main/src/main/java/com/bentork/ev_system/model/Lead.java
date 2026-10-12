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
 * Represents a sales lead captured from various sources
 * (IndiaMART, phone calls, website, referrals, etc.).
 * 
 * A Lead can be converted to an {@link Opportunity} once qualified.
 */
@Entity
@Table(name = "leads", indexes = {
        @Index(name = "idx_lead_number", columnList = "leadNumber"),
        @Index(name = "idx_lead_status", columnList = "status"),
        @Index(name = "idx_lead_source", columnList = "source"),
        @Index(name = "idx_lead_owner", columnList = "owner_admin_id"),
        @Index(name = "idx_lead_follow_up", columnList = "nextFollowUpDate"),
        @Index(name = "idx_lead_indiamart", columnList = "indiaMartLeadId")
})
@Getter
@Setter
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String leadNumber; // e.g., "LD-20260924-0012"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private SalesCompany company; // May be null for cold leads

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private SalesContact contact; // May be null initially

    @Column(nullable = false)
    private String title; // Brief description: "48V Battery Enquiry"

    @Column(nullable = false)
    private String source; // LeadSource enum value

    @Column(nullable = false)
    private String status; // LeadStatus enum value

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_admin_id")
    private Admin ownerAdmin; // Sales exec who owns this lead

    private String city;

    private String state;

    private Double estimatedValue; // Rough deal value in ₹

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDate nextFollowUpDate;

    private String indiaMartLeadId; // External reference ID for deduplication

    private Long convertedToOpportunityId; // Set when lead is qualified and converted

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "new";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
