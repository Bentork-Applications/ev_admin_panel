package com.bentork.ev_system.dto.request;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class EnergyUpdateRequest {

    private Long sessionId;
    private BigDecimal currentKwh;

    // Getters and Setters
    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public BigDecimal getCurrentKwh() {
        return currentKwh;
    }

    public void setCurrentKwh(BigDecimal currentKwh) {
        this.currentKwh = currentKwh;
    }

}
