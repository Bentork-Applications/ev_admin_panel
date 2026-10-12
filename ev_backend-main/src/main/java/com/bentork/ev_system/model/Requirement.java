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
 * Represents a customer's product requirement gathered
 * during the sales qualification process.
 * 
 * Links to a {@link Lead} and/or {@link SalesCompany} and captures
 * specific product needs (category, specs, quantity, timeline, budget).
 */
@Entity
@Table(name = "requirements", indexes = {
        @Index(name = "idx_requirement_lead", columnList = "lead_id"),
        @Index(name = "idx_requirement_company", columnList = "company_id")
})
@Getter
@Setter
public class Requirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private SalesCompany company;

    private String productCategory; // "Battery", "Charger", "Accessory"

    private String voltage; // e.g., "48", "60", "72"

    private String capacity; // e.g., "30", "40" (in Ah)

    private String chemistry; // e.g., "NMC", "LFP", "LTO"

    private Integer quantity;

    private String timeline; // "Immediate", "1 Month", "3 Months", "6 Months"

    private Double budget; // Approximate budget in ₹

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
