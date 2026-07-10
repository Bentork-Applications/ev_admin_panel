package com.bentork.ev_system.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "charger_id", nullable = false)
    private Charger charger;

    private String boxId;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private double energyKwh;
    private String status;
    private double cost;
    private LocalDateTime createdAt;
    @Column(name = "source_type")
    private String sourceType; // values: "RFID" or "SESSION"

    @Column(name = "start_meter_reading")
    private Double startMeterReading;

    @Column(name = "last_meter_reading")
    private Double lastMeterReading;

    @Column(name = "charging_duration_seconds")
    private Long chargingDurationSeconds;

    @Column(name = "platform_fee")
    private Double platformFee;

    @Column(name = "pst_amount")
    private Double pstAmount;

    @Column(name = "reminder_sent")
    private Boolean reminderSent = false;

    @Column(name = "fully_charged_notified")
    private Boolean fullyChargedNotified = false;

    @Column(name = "amount_entered", precision = 10, scale = 2)
    private java.math.BigDecimal amountEntered;

    @Column(name = "effective_rate_applied", precision = 10, scale = 4)
    private java.math.BigDecimal effectiveRateApplied;

    @Column(name = "allocated_kwh", precision = 10, scale = 2)
    private java.math.BigDecimal allocatedKwh;

    @Column(name = "chargeable_amount", precision = 10, scale = 2)
    private java.math.BigDecimal chargeableAmount;

    @Column(name = "refund_amount", precision = 10, scale = 2)
    private java.math.BigDecimal refundAmount;

    @Column(name = "refund_status")
    private String refundStatus;

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Charger getCharger() {
        return charger;
    }

    public void setCharger(Charger charger) {
        this.charger = charger;
    }

    public String getBoxId() {
        return boxId;
    }

    public void setBoxId(String boxId) {
        this.boxId = boxId;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public double getEnergyKwh() {
        return energyKwh;
    }

    public void setEnergyKwh(double energyKwh) {
        this.energyKwh = energyKwh;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public double getCost() {
        return cost;
    }

    public void setCost(double cost) {
        this.cost = cost;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public Double getStartMeterReading() {
        return startMeterReading;
    }

    public void setStartMeterReading(Double startMeterReading) {
        this.startMeterReading = startMeterReading;
    }

    public Double getLastMeterReading() {
        return lastMeterReading;
    }

    public void setLastMeterReading(Double lastMeterReading) {
        this.lastMeterReading = lastMeterReading;
    }

    public Long getChargingDurationSeconds() {
        return chargingDurationSeconds;
    }

    public void setChargingDurationSeconds(Long chargingDurationSeconds) {
        this.chargingDurationSeconds = chargingDurationSeconds;
    }

    public Double getPlatformFee() {
        return platformFee;
    }

    public void setPlatformFee(Double platformFee) {
        this.platformFee = platformFee;
    }

    public Double getPstAmount() {
        return pstAmount;
    }

    public void setPstAmount(Double pstAmount) {
        this.pstAmount = pstAmount;
    }

    public Boolean getReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(Boolean reminderSent) {
        this.reminderSent = reminderSent;
    }

    public Boolean getFullyChargedNotified() {
        return fullyChargedNotified;
    }

    public void setFullyChargedNotified(Boolean fullyChargedNotified) {
        this.fullyChargedNotified = fullyChargedNotified;
    }

    public java.math.BigDecimal getAmountEntered() {
        return amountEntered;
    }

    public void setAmountEntered(java.math.BigDecimal amountEntered) {
        this.amountEntered = amountEntered;
    }

    public java.math.BigDecimal getEffectiveRateApplied() {
        return effectiveRateApplied;
    }

    public void setEffectiveRateApplied(java.math.BigDecimal effectiveRateApplied) {
        this.effectiveRateApplied = effectiveRateApplied;
    }

    public java.math.BigDecimal getAllocatedKwh() {
        return allocatedKwh;
    }

    public void setAllocatedKwh(java.math.BigDecimal allocatedKwh) {
        this.allocatedKwh = allocatedKwh;
    }

    public java.math.BigDecimal getChargeableAmount() {
        return chargeableAmount;
    }

    public void setChargeableAmount(java.math.BigDecimal chargeableAmount) {
        this.chargeableAmount = chargeableAmount;
    }

    public java.math.BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(java.math.BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }
}
