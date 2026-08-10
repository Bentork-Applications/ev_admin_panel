package com.bentork.ev_system.dto.request;

import java.time.LocalDate;

public class DispatchDetailsDTO {

    private String courierName;
    private String trackingNumber;
    private LocalDate dispatchDate;

    // Getters and Setters

    public String getCourierName() {
        return courierName;
    }

    public void setCourierName(String courierName) {
        this.courierName = courierName;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public LocalDate getDispatchDate() {
        return dispatchDate;
    }

    public void setDispatchDate(LocalDate dispatchDate) {
        this.dispatchDate = dispatchDate;
    }
}
