package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import com.bentork.ev_system.enums.OrderStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String priority = "medium"; // low, medium, high, urgent

    @Column(nullable = false)
    private String status = OrderStatus.PENDING.getValue();

    @Column(nullable = false)
    private Long assignedToUserId;

    @Column(nullable = false)
    private String assignedToUserEmail;

    private String assignedToUserName;

    @Column(nullable = false)
    private String createdByAdminEmail;

    private String lastUpdatedByAdminEmail;

    private String cancelReason;

    @Column(columnDefinition = "TEXT")
    private String adminNotes;

    // Lifecycle timestamps
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    private LocalDateTime inProgressAt;

    private LocalDateTime testingAt;

    private LocalDateTime completedAt;

    private LocalDateTime dispatchedAt;

    private LocalDateTime deliveredAt;

    private LocalDateTime cancelledAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = OrderStatus.PENDING.getValue();
        }
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

    public Long getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(Long assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public String getAssignedToUserEmail() {
        return assignedToUserEmail;
    }

    public void setAssignedToUserEmail(String assignedToUserEmail) {
        this.assignedToUserEmail = assignedToUserEmail;
    }

    public String getAssignedToUserName() {
        return assignedToUserName;
    }

    public void setAssignedToUserName(String assignedToUserName) {
        this.assignedToUserName = assignedToUserName;
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

    public void appendAdminNote(String note) {
        if (note != null && !note.trim().isEmpty()) {
            if (this.adminNotes == null) {
                this.adminNotes = "";
            }
            this.adminNotes += "\n[" + LocalDateTime.now().toString() + "] " + note;
        }
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
}
