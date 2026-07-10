package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

/**
 * Response DTO for maintenance schedule operations.
 */
public class MaintenanceResponse {

    private Long id;
    private String targetType;
    private Long targetId;
    private String targetName;
    private String reason;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;
    private String status;
    private int cancelledBookingsCount;
    private LocalDateTime createdAt;
    private String createdByAdminName;

    // Getters & Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public String getTargetName() {
        return targetName;
    }

    public void setTargetName(String targetName) {
        this.targetName = targetName;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getScheduledStart() {
        return scheduledStart;
    }

    public void setScheduledStart(LocalDateTime scheduledStart) {
        this.scheduledStart = scheduledStart;
    }

    public LocalDateTime getScheduledEnd() {
        return scheduledEnd;
    }

    public void setScheduledEnd(LocalDateTime scheduledEnd) {
        this.scheduledEnd = scheduledEnd;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getCancelledBookingsCount() {
        return cancelledBookingsCount;
    }

    public void setCancelledBookingsCount(int cancelledBookingsCount) {
        this.cancelledBookingsCount = cancelledBookingsCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedByAdminName() {
        return createdByAdminName;
    }

    public void setCreatedByAdminName(String createdByAdminName) {
        this.createdByAdminName = createdByAdminName;
    }
}
