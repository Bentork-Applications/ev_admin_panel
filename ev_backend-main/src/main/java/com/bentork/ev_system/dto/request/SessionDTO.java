package com.bentork.ev_system.dto.request;

import java.math.BigDecimal;

public class SessionDTO {

    private Long userId;
    private Long chargerId;
    private String boxId;
    private Long sessionId;

    private String message;
    private double energyUsed;
    private double cost;
    private String status;
    private BigDecimal selectedKwh; // ✅ NEW - for package/custom input
    private BigDecimal amountEntered; // ✅ NEW - for MONEY_BASED input

    // Getters and Setters

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getChargerId() {
        return chargerId;
    }

    public void setChargerId(Long chargerId) {
        this.chargerId = chargerId;
    }

    public String getBoxId() {
        return boxId;
    }

    public void setBoxId(String boxId) {
        this.boxId = boxId;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public double getEnergyUsed() {
        return energyUsed;
    }

    public void setEnergyUsed(double energyUsed) {
        this.energyUsed = energyUsed;
    }

    public double getCost() {
        return cost;
    }

    public void setCost(double cost) {
        this.cost = cost;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }


    public BigDecimal getSelectedKwh() {
        return selectedKwh;
    }

    public void setSelectedKwh(BigDecimal selectedKwh) {
        this.selectedKwh = selectedKwh;
    }

    public BigDecimal getAmountEntered() {
        return amountEntered;
    }

    public void setAmountEntered(BigDecimal amountEntered) {
        this.amountEntered = amountEntered;
    }

}
