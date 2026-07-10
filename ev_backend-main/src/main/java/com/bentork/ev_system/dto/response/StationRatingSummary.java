package com.bentork.ev_system.dto.response;

import java.util.Map;

public class StationRatingSummary {

    private Long stationId;
    private String stationName;
    private Double averageRating; // e.g. 4.3
    private Long totalReviews; // e.g. 27
    private Map<Integer, Long> ratingDistribution; // {5: 10, 4: 8, 3: 5, 2: 3, 1: 1}

    // Getters & Setters

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

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Long getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(Long totalReviews) {
        this.totalReviews = totalReviews;
    }

    public Map<Integer, Long> getRatingDistribution() {
        return ratingDistribution;
    }

    public void setRatingDistribution(Map<Integer, Long> ratingDistribution) {
        this.ratingDistribution = ratingDistribution;
    }
}
