package com.bentork.ev_system.dto.request;

public class WarrantyClaimDTO {

    private Long batteryDataId;
    private String issueDescription;
    private String photoBase64;
    private Boolean termsAccepted;

    // Getters and Setters

    public Long getBatteryDataId() {
        return batteryDataId;
    }

    public void setBatteryDataId(Long batteryDataId) {
        this.batteryDataId = batteryDataId;
    }

    public String getIssueDescription() {
        return issueDescription;
    }

    public void setIssueDescription(String issueDescription) {
        this.issueDescription = issueDescription;
    }

    public String getPhotoBase64() {
        return photoBase64;
    }

    public void setPhotoBase64(String photoBase64) {
        this.photoBase64 = photoBase64;
    }

    public Boolean getTermsAccepted() {
        return termsAccepted;
    }

    public void setTermsAccepted(Boolean termsAccepted) {
        this.termsAccepted = termsAccepted;
    }
}
