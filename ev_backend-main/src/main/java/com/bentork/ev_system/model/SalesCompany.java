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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a customer/prospect company in the Sales CRM.
 * 
 * This is separate from the {@link Vendor} entity which represents
 * procurement suppliers. SalesCompany tracks companies being sold TO.
 */
@Entity
@Table(name = "sales_companies", indexes = {
        @Index(name = "idx_sales_company_name", columnList = "name"),
        @Index(name = "idx_sales_company_city", columnList = "city"),
        @Index(name = "idx_sales_company_state", columnList = "state"),
        @Index(name = "idx_sales_company_owner", columnList = "owner_admin_id"),
        @Index(name = "idx_sales_company_active", columnList = "active")
})
@Getter
@Setter
public class SalesCompany {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String industry; // e.g., "EV OEM", "Fleet Operator", "Logistics"

    private String companyType; // e.g., "Dealer", "Distributor", "OEM", "End User"

    private String gstNumber;

    private String phone;

    private String email;

    private String website;

    @Column(columnDefinition = "TEXT")
    private String address;

    private String city;

    private String state;

    private String pincode;

    private String source; // How we discovered them: LeadSource enum value

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_admin_id")
    private Admin ownerAdmin;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
