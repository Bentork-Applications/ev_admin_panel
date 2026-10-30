package com.bentork.ev_system.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.bentork.ev_system.enums.OrderStatus;
import com.bentork.ev_system.enums.PaymentStatus;
import com.bentork.ev_system.enums.ProductionStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_order_pi_number", columnList = "piNumber"),
        @Index(name = "idx_order_status", columnList = "orderStatus"),
        @Index(name = "idx_order_production_status", columnList = "productionStatus"),
        @Index(name = "idx_order_created_by", columnList = "createdByAdminEmail"),
        @Index(name = "idx_order_assigned_user", columnList = "assigned_user_id")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    // ==================== SALES STAGE FIELDS ====================

    @Column(name = "assigned_user_id", nullable = false)
    private Long assignedUserId;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private String piNumber;

    // Legacy fields — kept for backward compatibility with existing data.
    // New orders populate these from the first OrderItem.
    @Column(nullable = false)
    private String productDetails;

    @Column(nullable = false)
    private Integer quantity;

    // ==================== ORDER ITEMS (Multiple Products) ====================

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> orderItems = new ArrayList<>();

    // ==================== ORDER TRACKING ====================

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderTracking> trackingUpdates = new ArrayList<>();

    @Column(nullable = false)
    private String mobileNumber;

    @Column(nullable = false)
    private LocalDate expectedDeliveryDate;

    @Column(nullable = false)
    private String paymentStatus = PaymentStatus.PENDING.getValue();

    // ==================== PAYMENT AMOUNT FIELDS ====================

    @Column(nullable = false)
    private Double totalInvoiceAmount;

    @Column(nullable = false)
    private Double receivedAmount = 0.0;

    @Column(nullable = false)
    private Double pendingAmount;

    @Column(nullable = false)
    private String priority = "medium"; // low, medium, high

    // ==================== LIFECYCLE STATUS ====================

    @Column(nullable = false)
    private String orderStatus = OrderStatus.SALES_REGISTERED.getValue();

    // ==================== PRODUCTION STAGE FIELDS ====================

    private String productionStatus = ProductionStatus.CONFIRM.getValue();

    // ==================== SCM STAGE FIELDS ====================

    private String invoiceNumber;

    private String barcode;

    private Integer serviceWarrantyMonths;

    private Integer fullWarrantyMonths;

    private Integer totalWarrantyMonths;

    private LocalDate warrantyStartDate;

    private LocalDate warrantyEndDate;

    private String trackingId;

    // ==================== AUDIT FIELDS ====================

    @Column(nullable = false)
    private String createdByAdminEmail;

    private String productionUpdatedByEmail;

    private String scmUpdatedByEmail;

    // ==================== TIMESTAMPS ====================

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    private LocalDateTime productionCompletedAt;

    private LocalDateTime scmCompletedAt;

    private LocalDateTime dispatchedAt;

    private LocalDateTime deliveredAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.orderStatus == null) {
            this.orderStatus = OrderStatus.SALES_REGISTERED.getValue();
        }
        if (this.productionStatus == null) {
            this.productionStatus = ProductionStatus.CONFIRM.getValue();
        }
        if (this.paymentStatus == null) {
            this.paymentStatus = PaymentStatus.PENDING.getValue();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ==================== HELPER METHODS ====================

    /**
     * Returns the total quantity across all order items.
     * Falls back to the legacy quantity field if no items exist.
     */
    public int getTotalQuantity() {
        if (orderItems != null && !orderItems.isEmpty()) {
            return orderItems.stream().mapToInt(OrderItem::getQuantity).sum();
        }
        return (quantity != null) ? quantity : 0;
    }

    // ==================== GETTERS AND SETTERS ====================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public Long getAssignedUserId() {
        return assignedUserId;
    }

    public void setAssignedUserId(Long assignedUserId) {
        this.assignedUserId = assignedUserId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getPiNumber() {
        return piNumber;
    }

    public void setPiNumber(String piNumber) {
        this.piNumber = piNumber;
    }

    public String getProductDetails() {
        return productDetails;
    }

    public void setProductDetails(String productDetails) {
        this.productDetails = productDetails;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public LocalDate getExpectedDeliveryDate() {
        return expectedDeliveryDate;
    }

    public void setExpectedDeliveryDate(LocalDate expectedDeliveryDate) {
        this.expectedDeliveryDate = expectedDeliveryDate;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public Double getTotalInvoiceAmount() {
        return totalInvoiceAmount;
    }

    public void setTotalInvoiceAmount(Double totalInvoiceAmount) {
        this.totalInvoiceAmount = totalInvoiceAmount;
    }

    public Double getReceivedAmount() {
        return receivedAmount;
    }

    public void setReceivedAmount(Double receivedAmount) {
        this.receivedAmount = receivedAmount;
    }

    public Double getPendingAmount() {
        return pendingAmount;
    }

    public void setPendingAmount(Double pendingAmount) {
        this.pendingAmount = pendingAmount;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
    }

    public String getProductionStatus() {
        return productionStatus;
    }

    public void setProductionStatus(String productionStatus) {
        this.productionStatus = productionStatus;
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

    public Integer getServiceWarrantyMonths() {
        return serviceWarrantyMonths;
    }

    public void setServiceWarrantyMonths(Integer serviceWarrantyMonths) {
        this.serviceWarrantyMonths = serviceWarrantyMonths;
    }

    public Integer getFullWarrantyMonths() {
        return fullWarrantyMonths;
    }

    public void setFullWarrantyMonths(Integer fullWarrantyMonths) {
        this.fullWarrantyMonths = fullWarrantyMonths;
    }

    public Integer getTotalWarrantyMonths() {
        return totalWarrantyMonths;
    }

    public void setTotalWarrantyMonths(Integer totalWarrantyMonths) {
        this.totalWarrantyMonths = totalWarrantyMonths;
    }

    public String getTrackingId() {
        return trackingId;
    }

    public void setTrackingId(String trackingId) {
        this.trackingId = trackingId;
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

    public String getCreatedByAdminEmail() {
        return createdByAdminEmail;
    }

    public void setCreatedByAdminEmail(String createdByAdminEmail) {
        this.createdByAdminEmail = createdByAdminEmail;
    }

    public String getProductionUpdatedByEmail() {
        return productionUpdatedByEmail;
    }

    public void setProductionUpdatedByEmail(String productionUpdatedByEmail) {
        this.productionUpdatedByEmail = productionUpdatedByEmail;
    }

    public String getScmUpdatedByEmail() {
        return scmUpdatedByEmail;
    }

    public void setScmUpdatedByEmail(String scmUpdatedByEmail) {
        this.scmUpdatedByEmail = scmUpdatedByEmail;
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

    public LocalDateTime getProductionCompletedAt() {
        return productionCompletedAt;
    }

    public void setProductionCompletedAt(LocalDateTime productionCompletedAt) {
        this.productionCompletedAt = productionCompletedAt;
    }

    public LocalDateTime getScmCompletedAt() {
        return scmCompletedAt;
    }

    public void setScmCompletedAt(LocalDateTime scmCompletedAt) {
        this.scmCompletedAt = scmCompletedAt;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public List<OrderItem> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItem> orderItems) {
        this.orderItems = orderItems;
    }

    public List<OrderTracking> getTrackingUpdates() {
        return trackingUpdates;
    }

    public void setTrackingUpdates(List<OrderTracking> trackingUpdates) {
        this.trackingUpdates = trackingUpdates;
    }
}
