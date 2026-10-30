package com.bentork.ev_system.dto.response;

public class CafeResponseDTO {

    private Long id;
    private Long stationId;
    private String stationName;
    private boolean adminAdded;
    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private Double rating;
    private Boolean openNow;
    private String googleMapsUri;
    private String googleMapImageUrl;
    private String category;

    public CafeResponseDTO() {
    }

    public CafeResponseDTO(String name, String address, Double latitude, Double longitude,
            Double rating, Boolean openNow, String googleMapsUri, String category) {
        this.name = name;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.rating = rating;
        this.openNow = openNow;
        this.googleMapsUri = googleMapsUri;
        this.category = category;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public boolean isAdminAdded() {
        return adminAdded;
    }

    public void setAdminAdded(boolean adminAdded) {
        this.adminAdded = adminAdded;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
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

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Boolean getOpenNow() {
        return openNow;
    }

    public void setOpenNow(Boolean openNow) {
        this.openNow = openNow;
    }

    public String getGoogleMapsUri() {
        return googleMapsUri;
    }

    public void setGoogleMapsUri(String googleMapsUri) {
        this.googleMapsUri = googleMapsUri;
    }

    public String getGoogleMapImageUrl() {
        return googleMapImageUrl;
    }

    public void setGoogleMapImageUrl(String googleMapImageUrl) {
        this.googleMapImageUrl = googleMapImageUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
