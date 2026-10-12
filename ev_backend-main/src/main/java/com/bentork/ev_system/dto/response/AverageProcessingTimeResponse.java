package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

public class AverageProcessingTimeResponse {

    private Double averageProcessingTimeHours;
    private Long totalCompletedClaims;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;

    // Getters and Setters

    public Double getAverageProcessingTimeHours() {
        return averageProcessingTimeHours;
    }

    public void setAverageProcessingTimeHours(Double averageProcessingTimeHours) {
        this.averageProcessingTimeHours = averageProcessingTimeHours;
    }

    public Long getTotalCompletedClaims() {
        return totalCompletedClaims;
    }

    public void setTotalCompletedClaims(Long totalCompletedClaims) {
        this.totalCompletedClaims = totalCompletedClaims;
    }

    public LocalDateTime getFromDate() {
        return fromDate;
    }

    public void setFromDate(LocalDateTime fromDate) {
        this.fromDate = fromDate;
    }

    public LocalDateTime getToDate() {
        return toDate;
    }

    public void setToDate(LocalDateTime toDate) {
        this.toDate = toDate;
    }
}
