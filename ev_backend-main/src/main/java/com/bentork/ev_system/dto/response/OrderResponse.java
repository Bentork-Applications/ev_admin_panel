package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

public class OrderResponse {

    private Long id;
    private String orderNumber;
    private String title;
    private String description;
    private String priority;
    private String status;
    private String assignedToUserName;
    private String assignedToUserEmail;
    private Long assignedToUserId;
    private String createdByAdminEmail;
    private String lastUpdatedByAdminEmail;
    private String cancelReason;
    private String adminNotes;

    // Timeline timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime inProgressAt;
    private LocalDateTime testingAt;
    private LocalDateTime completedAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;

    // Computed duration in hours (if completed)
    private Double processingDurationHours;

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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedToUserName() {
        return assignedToUserName;
    }

    public void setAssignedToUserName(String assignedToUserName) {
        this.assignedToUserName = assignedToUserName;
    }

    public String getAssignedToUserEmail() {
        return assignedToUserEmail;
    }

    public void setAssignedToUserEmail(String assignedToUserEmail) {
        this.assignedToUserEmail = assignedToUserEmail;
    }

    public Long getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(Long assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public String getCreatedByAdminEmail() {
        return createdByAdminEmail;
    }

    public void setCreatedByAdminEmail(String createdByAdminEmail) {
        this.createdByAdminEmail = createdByAdminEmail;
    }

    public String getLastUpdatedByAdminEmail() {
        return lastUpdatedByAdminEmail;
    }

    public void setLastUpdatedByAdminEmail(String lastUpdatedByAdminEmail) {
        this.lastUpdatedByAdminEmail = lastUpdatedByAdminEmail;
    }

    public String getCancelReason() {
        return cancelReason;
    }

    public void setCancelReason(String cancelReason) {
        this.cancelReason = cancelReason;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
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

    public LocalDateTime getInProgressAt() {
        return inProgressAt;
    }

    public void setInProgressAt(LocalDateTime inProgressAt) {
        this.inProgressAt = inProgressAt;
    }

    public LocalDateTime getTestingAt() {
        return testingAt;
    }

    public void setTestingAt(LocalDateTime testingAt) {
        this.testingAt = testingAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
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

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public Double getProcessingDurationHours() {
        return processingDurationHours;
    }

    public void setProcessingDurationHours(Double processingDurationHours) {
        this.processingDurationHours = processingDurationHours;
    }
}
