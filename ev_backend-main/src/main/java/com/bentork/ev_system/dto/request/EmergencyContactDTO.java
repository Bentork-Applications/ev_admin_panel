package com.bentork.ev_system.dto.request;

public class EmergencyContactDTO {
    private Long id;
    private String cpoPhoneNumber;
    private String companySupportNumber;
    private Long stationId;
    private String stationName;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCpoPhoneNumber() { return cpoPhoneNumber; }
    public void setCpoPhoneNumber(String cpoPhoneNumber) { this.cpoPhoneNumber = cpoPhoneNumber; }

    public String getCompanySupportNumber() { return companySupportNumber; }
    public void setCompanySupportNumber(String companySupportNumber) { this.companySupportNumber = companySupportNumber; }

    public Long getStationId() { return stationId; }
    public void setStationId(Long stationId) { this.stationId = stationId; }

    public String getStationName() { return stationName; }
    public void setStationName(String stationName) { this.stationName = stationName; }
}
