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
 * Represents a sales deal in the pipeline.
 * 
 * An Opportunity is created when a {@link Lead} is qualified.
 * It progresses through stages (Qualified → Requirement → Proposal → Negotiation → Won/Lost).
 * 
 * When Won, it bridges to the existing {@link Order} entity via {@code linkedOrderId},
 * integrating seamlessly with the existing Sales → Production → SCM pipeline.
 */
@Entity
@Table(name = "opportunities", indexes = {
        @Index(name = "idx_opportunity_number", columnList = "opportunityNumber"),
        @Index(name = "idx_opportunity_stage", columnList = "stage"),
        @Index(name = "idx_opportunity_owner", columnList = "owner_admin_id"),
        @Index(name = "idx_opportunity_company", columnList = "company_id"),
        @Index(name = "idx_opportunity_close_date", columnList = "expectedCloseDate")
})
@Getter
@Setter
public class Opportunity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String opportunityNumber; // e.g., "OPP-20260924-0003"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead; // Source lead (nullable if created directly)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private SalesCompany company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private SalesContact contact;

    @Column(nullable = false)
    private String title; // e.g., "48V 30Ah Battery Pack — 100 units"

    @Column(nullable = false)
    private String stage; // OpportunityStage enum value

    private Double value; // Deal value in ₹

    private LocalDate expectedCloseDate;

    private Integer probability; // 0-100%

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_admin_id")
    private Admin ownerAdmin;

    // Bridge to existing Order pipeline — set when stage = WON
    private Long linkedOrderId;

    private String lostReason; // Filled when stage = LOST

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.stage == null) {
            this.stage = "qualified";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
