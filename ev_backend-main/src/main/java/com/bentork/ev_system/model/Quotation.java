package com.bentork.ev_system.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a commercial quotation sent to a customer.
 * 
 * A Quotation belongs to an {@link Opportunity} and a {@link SalesCompany}.
 * Line items are stored in {@link QuotationItem} and reference the existing
 * {@link Product} catalog.
 * 
 * Supports versioning — revised quotes increment the version number.
 */
@Entity
@Table(name = "quotations", indexes = {
        @Index(name = "idx_quotation_number", columnList = "quoteNumber"),
        @Index(name = "idx_quotation_opportunity", columnList = "opportunity_id"),
        @Index(name = "idx_quotation_company", columnList = "company_id"),
        @Index(name = "idx_quotation_status", columnList = "status")
})
@Getter
@Setter
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String quoteNumber; // e.g., "QT-20260924-0001"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id")
    private Opportunity opportunity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private SalesCompany company;

    private Integer version = 1; // For revised quotes

    @Column(nullable = false)
    private String status; // QuotationStatus enum value

    private Double totalAmount;

    private Double discount; // Discount percentage or flat amount

    private Double finalAmount; // After discount

    private LocalDate validUntil; // Quote expiry date

    @Column(columnDefinition = "TEXT")
    private String termsAndConditions;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationItem> items = new ArrayList<>();

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
            this.status = "draft";
        }
        if (this.version == null) {
            this.version = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
