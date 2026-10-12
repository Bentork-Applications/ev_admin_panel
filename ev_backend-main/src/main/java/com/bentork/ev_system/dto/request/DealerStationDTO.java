package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;

/**
 * DTO for dealer-station mapping information
 */
public class DealerStationDTO {

    private Long id;
    private Long dealerId;
    private String dealerName;
    private String dealerEmail;
    private Long stationId;
    private String stationName;
    private String stationStatus;
    private LocalDateTime assignedAt;

    // Default constructor
    public DealerStationDTO() {
    }

    // All-args constructor
    public DealerStationDTO(Long id, Long dealerId, String dealerName, String dealerEmail,
            Long stationId, String stationName, String stationStatus,
            LocalDateTime assignedAt) {
        this.id = id;
        this.dealerId = dealerId;
        this.dealerName = dealerName;
        this.dealerEmail = dealerEmail;
        this.stationId = stationId;
        this.stationName = stationName;
        this.stationStatus = stationStatus;
        this.assignedAt = assignedAt;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDealerId() {
        return dealerId;
    }

    public void setDealerId(Long dealerId) {
        this.dealerId = dealerId;
    }

    public String getDealerName() {
        return dealerName;
    }

    public void setDealerName(String dealerName) {
        this.dealerName = dealerName;
    }

    public String getDealerEmail() {
        return dealerEmail;
    }

    public void setDealerEmail(String dealerEmail) {
        this.dealerEmail = dealerEmail;
    }

    public Long getStationId() {
        return stationId;
    }

    public void setStationId(Long stationId) {
        this.stationId = stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public void setStationName(String stationName) {
        this.stationName = stationName;
    }

    public String getStationStatus() {
        return stationStatus;
    }

    public void setStationStatus(String stationStatus) {
        this.stationStatus = stationStatus;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }
}
