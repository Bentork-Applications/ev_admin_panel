package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class SlotDTO {

    private Long id;
    private Long chargerId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean booked;
    private LocalDateTime createdAt;

    // Time-only fields for all-day slots (e.g. "09:00")
    private LocalTime startTimeOnly;
    private LocalTime endTimeOnly;

    // For bulk slot generation
    private String date; // format: "2026-02-20" (optional — omit for allDay slots)
    private int durationMinutes; // e.g., 30 or 60
    private boolean allDay; // if true, slots repeat every day (no specific date)

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getChargerId() {
        return chargerId;
    }

    public void setChargerId(Long chargerId) {
        this.chargerId = chargerId;
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

    public boolean isBooked() {
        return booked;
    }

    public void setBooked(boolean booked) {
        this.booked = booked;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public boolean isAllDay() {
        return allDay;
    }

    public void setAllDay(boolean allDay) {
        this.allDay = allDay;
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
}
