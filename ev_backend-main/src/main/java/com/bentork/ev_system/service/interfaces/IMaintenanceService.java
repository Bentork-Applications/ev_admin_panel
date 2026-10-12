package com.bentork.ev_system.service.interfaces;

import java.time.LocalDateTime;
import java.util.List;

import com.bentork.ev_system.dto.request.MaintenanceRequest;
import com.bentork.ev_system.dto.response.MaintenanceResponse;
import com.bentork.ev_system.model.MaintenanceSchedule;

/**
 * Interface for maintenance schedule operations.
 * Decouples controllers and other services from the concrete implementation.
 *
 * Follows the Dependency Inversion Principle (SOLID 'D'):
 * High-level modules (controllers, SessionService, SlotBookingService) depend on
 * this abstraction rather than the concrete MaintenanceService.
 */
public interface IMaintenanceService {

    /**
     * Schedule maintenance for an entire station.
     */
    MaintenanceResponse scheduleStationMaintenance(Long stationId, MaintenanceRequest request);

    /**
     * Schedule maintenance for a single charger.
     */
    MaintenanceResponse scheduleChargerMaintenance(Long chargerId, MaintenanceRequest request);

    /**
     * Cancel or end a maintenance schedule.
     */
    MaintenanceResponse cancelMaintenance(Long scheduleId);

    /**
     * Check if a charger is currently under ACTIVE maintenance
     * (either charger-level or station-level).
     * Used as a guard by SessionService and ReceiptService.
     */
    boolean isChargerUnderMaintenance(Long chargerId);

    /**
     * Check if a slot booking's time window overlaps any ACTIVE or SCHEDULED
     * maintenance. Used as a guard by SlotBookingService.
     */
    boolean hasMaintenanceOverlap(Long chargerId, LocalDateTime slotStart, LocalDateTime slotEnd);

    /**
     * Activate a scheduled maintenance (called by scheduler when start time is reached).
     */
    void activateSchedule(MaintenanceSchedule schedule);

    /**
     * Complete an active maintenance (called by scheduler when end time is reached).
     */
    void completeSchedule(MaintenanceSchedule schedule);

    /**
     * Get all active and scheduled maintenance schedules.
     */
    List<MaintenanceResponse> getActiveAndScheduledMaintenance();

    /**
     * Get maintenance history for a station.
     */
    List<MaintenanceResponse> getMaintenanceByStation(Long stationId);

    /**
     * Get maintenance history for a charger.
     */
    List<MaintenanceResponse> getMaintenanceByCharger(Long chargerId);

    /**
     * Get full maintenance history, optionally filtered by status.
     * Returns all statuses when status parameter is null or blank.
     */
    List<MaintenanceResponse> getMaintenanceHistory(String status);
}
