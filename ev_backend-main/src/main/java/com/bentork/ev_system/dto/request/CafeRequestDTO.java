package com.bentork.ev_system.dto.request;

public class CafeRequestDTO {

    private Long stationId;
    private String name;
    private String googleMapLocation;
    private String googleMapImageUrl;
    private Double rating;
    private Boolean isOpen;
    private Double latitude;
    private Double longitude;
    private String address;
    private String category;

    // Getters and Setters

    public Long getStationId() {
        return stationId;
    }

    public void setStationId(Long stationId) {
        this.stationId = stationId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGoogleMapLocation() {
        return googleMapLocation;
    }

    public void setGoogleMapLocation(String googleMapLocation) {
        this.googleMapLocation = googleMapLocation;
    }

    public String getGoogleMapImageUrl() {
        return googleMapImageUrl;
    }

    public void setGoogleMapImageUrl(String googleMapImageUrl) {
        this.googleMapImageUrl = googleMapImageUrl;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Boolean getIsOpen() {
        return isOpen;
    }

    public void setIsOpen(Boolean isOpen) {
        this.isOpen = isOpen;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
