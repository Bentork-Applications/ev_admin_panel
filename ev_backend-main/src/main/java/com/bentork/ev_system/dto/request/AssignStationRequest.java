package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for assigning stations to a dealer
 */
public class AssignStationRequest {

    @NotNull(message = "Dealer ID is required")
    private Long dealerId;

    @NotNull(message = "Station IDs are required")
    private List<Long> stationIds;

    // Default constructor
    public AssignStationRequest() {
    }

    // All-args constructor
    public AssignStationRequest(Long dealerId, List<Long> stationIds) {
        this.dealerId = dealerId;
        this.stationIds = stationIds;
    }

    // Getters and Setters

    public Long getDealerId() {
        return dealerId;
    }

    public void setDealerId(Long dealerId) {
        this.dealerId = dealerId;
    }

    public List<Long> getStationIds() {
        return stationIds;
    }

    public void setStationIds(List<Long> stationIds) {
        this.stationIds = stationIds;
    }
}
