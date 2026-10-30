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

@Entity
@Table(name = "battery_data", indexes = {
        @Index(name = "idx_battery_invoice_number", columnList = "invoiceNumber"),
        @Index(name = "idx_battery_barcode", columnList = "barcode")
})
public class BatteryData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    // Optional: references a product from the catalog (new registrations)
    private Long productId;

    @Column(nullable = false)
    private String productDetails;

    @Column(nullable = false)
    private String invoiceNumber;

    @Column(nullable = false, unique = true)
    private String barcode;


    @Column(columnDefinition = "TEXT")
    private String address;

    // Full Warranty (Replacement) — existing fields retained for backward compatibility
    @Column(nullable = false)
    private LocalDate warrantyStartDate;

    @Column(nullable = false)
    private LocalDate warrantyEndDate;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean isFullWarrantyActive = true;

    private String fullWarrantyStatusReason;

    // Service Warranty (Repair/Servicing) — optional, extends beyond full warranty
    private LocalDate serviceWarrantyStartDate;

    private LocalDate serviceWarrantyEndDate;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean isServiceWarrantyActive = true;

    private String serviceWarrantyStatusReason;

    private String createdByAdminEmail;

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

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getProductDetails() {
        return productDetails;
    }

    public void setProductDetails(String productDetails) {
        this.productDetails = productDetails;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }


    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }



    public LocalDate getWarrantyStartDate() {
        return warrantyStartDate;
    }

    public void setWarrantyStartDate(LocalDate warrantyStartDate) {
        this.warrantyStartDate = warrantyStartDate;
    }

    public LocalDate getWarrantyEndDate() {
        return warrantyEndDate;
    }

    public void setWarrantyEndDate(LocalDate warrantyEndDate) {
        this.warrantyEndDate = warrantyEndDate;
    }

    public LocalDate getServiceWarrantyStartDate() {
        return serviceWarrantyStartDate;
    }

    public void setServiceWarrantyStartDate(LocalDate serviceWarrantyStartDate) {
        this.serviceWarrantyStartDate = serviceWarrantyStartDate;
    }

    public LocalDate getServiceWarrantyEndDate() {
        return serviceWarrantyEndDate;
    }

    public void setServiceWarrantyEndDate(LocalDate serviceWarrantyEndDate) {
        this.serviceWarrantyEndDate = serviceWarrantyEndDate;
    }

    public boolean isFullWarrantyActive() {
        return isFullWarrantyActive;
    }

    public void setFullWarrantyActive(boolean fullWarrantyActive) {
        isFullWarrantyActive = fullWarrantyActive;
    }

    public String getFullWarrantyStatusReason() {
        return fullWarrantyStatusReason;
    }

    public void setFullWarrantyStatusReason(String fullWarrantyStatusReason) {
        this.fullWarrantyStatusReason = fullWarrantyStatusReason;
    }

    public boolean isServiceWarrantyActive() {
        return isServiceWarrantyActive;
    }

    public void setServiceWarrantyActive(boolean serviceWarrantyActive) {
        isServiceWarrantyActive = serviceWarrantyActive;
    }

    public String getServiceWarrantyStatusReason() {
        return serviceWarrantyStatusReason;
    }

    public void setServiceWarrantyStatusReason(String serviceWarrantyStatusReason) {
        this.serviceWarrantyStatusReason = serviceWarrantyStatusReason;
    }

    public String getCreatedByAdminEmail() {
        return createdByAdminEmail;
    }

    public void setCreatedByAdminEmail(String createdByAdminEmail) {
        this.createdByAdminEmail = createdByAdminEmail;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
