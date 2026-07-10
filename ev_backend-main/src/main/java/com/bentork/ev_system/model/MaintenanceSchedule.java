package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import com.bentork.ev_system.enums.MaintenanceStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Represents a maintenance schedule for a station or a specific charger.
 *
 * Supports two target types:
 * - STATION: maintenance applies to ALL chargers on the station
 * - CHARGER: maintenance applies to a single specific charger
 *
 * Exactly one of {@code station} or {@code charger} is set (the other is null).
 *
 * Maintains a lifecycle: SCHEDULED → ACTIVE → COMPLETED (or CANCELLED).
 */
@Entity
@Table(name = "maintenance_schedules")
public class MaintenanceSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Set for station-level maintenance (null for charger-level).
     */
    @ManyToOne
    @JoinColumn(name = "station_id", nullable = true)
    private Station station;

    /**
     * Set for charger-level maintenance (null for station-level).
     */
    @ManyToOne
    @JoinColumn(name = "charger_id", nullable = true)
    private Charger charger;

    /**
     * Discriminator: "STATION" or "CHARGER".
     */
    @Column(nullable = false)
    private String targetType;

    /**
     * Optional free-text reason for maintenance.
     */
    private String reason;

    /**
     * When maintenance begins.
     */
    @Column(nullable = false)
    private LocalDateTime scheduledStart;

    /**
     * When maintenance ends.
     */
    @Column(nullable = false)
    private LocalDateTime scheduledEnd;

    /**
     * Current lifecycle status: scheduled, active, completed, cancelled.
     */
    @Column(nullable = false)
    private String status = MaintenanceStatus.SCHEDULED.getValue();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * The admin who created/activated this maintenance schedule.
     * Nullable for backward compatibility with existing records.
     */
    @ManyToOne
    @JoinColumn(name = "created_by_admin_id", nullable = true)
    private Admin createdByAdmin;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ==================== Getters & Setters ====================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Station getStation() {
        return station;
    }

    public void setStation(Station station) {
        this.station = station;
    }

    public Charger getCharger() {
        return charger;
    }

    public void setCharger(Charger charger) {
        this.charger = charger;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getScheduledStart() {
        return scheduledStart;
    }

    public void setScheduledStart(LocalDateTime scheduledStart) {
        this.scheduledStart = scheduledStart;
    }

    public LocalDateTime getScheduledEnd() {
        return scheduledEnd;
    }

    public void setScheduledEnd(LocalDateTime scheduledEnd) {
        this.scheduledEnd = scheduledEnd;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Admin getCreatedByAdmin() {
        return createdByAdmin;
    }

    public void setCreatedByAdmin(Admin createdByAdmin) {
        this.createdByAdmin = createdByAdmin;
    }
}
