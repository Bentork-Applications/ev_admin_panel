package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class OrderResponse {

    private Long id;
    private String orderNumber;

    // Sales stage fields
    private Long assignedUserId;
    private String customerName;
    private String piNumber;
    private String productDetails;
    private Integer quantity;
    private String mobileNumber;
    private LocalDate expectedDeliveryDate;
    private String paymentStatus;
    private Double totalInvoiceAmount;
    private Double receivedAmount;
    private Double pendingAmount;
    private String priority;

    // Order items (multiple products)
    private List<OrderItemResponse> orderItems;

    // Tracking updates
    private List<OrderTrackingResponseDTO> trackingUpdates;

    // Lifecycle status
    private String orderStatus;

    // Production stage fields
    private String productionStatus;

    // SCM stage fields
    private String invoiceNumber;
    private List<String> barcodes;
    private Integer serviceWarrantyMonths;
    private Integer fullWarrantyMonths;
    private Integer totalWarrantyMonths;
    private LocalDate warrantyStartDate;
    private LocalDate warrantyEndDate;
    private String trackingId;

    // Audit fields
    private String createdByAdminEmail;
    private String productionUpdatedByEmail;
    private String scmUpdatedByEmail;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime productionCompletedAt;
    private LocalDateTime scmCompletedAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime deliveredAt;

    // Getters and Setters

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

    public List<String> getBarcodes() {
        return barcodes;
    }

    public void setBarcodes(List<String> barcodes) {
        this.barcodes = barcodes;
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

    public List<OrderItemResponse> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItemResponse> orderItems) {
        this.orderItems = orderItems;
    }

    public List<OrderTrackingResponseDTO> getTrackingUpdates() {
        return trackingUpdates;
    }

    public void setTrackingUpdates(List<OrderTrackingResponseDTO> trackingUpdates) {
        this.trackingUpdates = trackingUpdates;
    }
}
