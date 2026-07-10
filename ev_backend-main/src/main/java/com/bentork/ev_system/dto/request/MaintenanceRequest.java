package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;

/**
 * Request DTO for scheduling a maintenance window.
 */
public class MaintenanceRequest {

    private String reason;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;

    // Getters & Setters

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
}
