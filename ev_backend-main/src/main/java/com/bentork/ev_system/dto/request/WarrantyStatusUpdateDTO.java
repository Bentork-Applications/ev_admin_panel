package com.bentork.ev_system.dto.request;

public class WarrantyStatusUpdateDTO {

    private Boolean fullWarrantyActive;
    private String fullWarrantyStatusReason;

    private Boolean serviceWarrantyActive;
    private String serviceWarrantyStatusReason;

    // Getters and Setters

    public Boolean getFullWarrantyActive() {
        return fullWarrantyActive;
    }

    public void setFullWarrantyActive(Boolean fullWarrantyActive) {
        this.fullWarrantyActive = fullWarrantyActive;
    }

    public String getFullWarrantyStatusReason() {
        return fullWarrantyStatusReason;
    }

    public void setFullWarrantyStatusReason(String fullWarrantyStatusReason) {
        this.fullWarrantyStatusReason = fullWarrantyStatusReason;
    }

    public Boolean getServiceWarrantyActive() {
        return serviceWarrantyActive;
    }

    public void setServiceWarrantyActive(Boolean serviceWarrantyActive) {
        this.serviceWarrantyActive = serviceWarrantyActive;
    }

    public String getServiceWarrantyStatusReason() {
        return serviceWarrantyStatusReason;
    }

    public void setServiceWarrantyStatusReason(String serviceWarrantyStatusReason) {
        this.serviceWarrantyStatusReason = serviceWarrantyStatusReason;
    }
}
