package com.bentork.ev_system.model;

import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "slots")
public class Slot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "charger_id", nullable = false)
    private Charger charger;

    // Used for date-specific slots (null for all-day slots)
    @Column(nullable = true)
    private LocalDateTime startTime;

    @Column(nullable = true)
    private LocalDateTime endTime;

    // Used for all-day (everyday) slots — stores only TIME in database (null for
    // date-specific slots)
    @Column(name = "start_time_only")
    private LocalTime startTimeOnly;

    @Column(name = "end_time_only")
    private LocalTime endTimeOnly;

    @Column(name = "is_booked", nullable = false)
    private boolean legacyIsBooked = false;

    @Column(name = "booked", nullable = false)
    private boolean booked = false;

    @Column(nullable = false)
    private boolean allDay = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Charger getCharger() {
        return charger;
    }

    public void setCharger(Charger charger) {
        this.charger = charger;
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

    public LocalTime getStartTimeOnly() {
        return startTimeOnly;
    }

    public void setStartTimeOnly(LocalTime startTimeOnly) {
        this.startTimeOnly = startTimeOnly;
    }

    public LocalTime getEndTimeOnly() {
        return endTimeOnly;
    }

    public void setEndTimeOnly(LocalTime endTimeOnly) {
        this.endTimeOnly = endTimeOnly;
    }

    public boolean isBooked() {
        return booked;
    }

    public void setBooked(boolean booked) {
        this.booked = booked;
        this.legacyIsBooked = booked;
    }

    public boolean isAllDay() {
        return allDay;
    }

    public void setAllDay(boolean allDay) {
        this.allDay = allDay;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
