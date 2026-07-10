package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.MaintenanceRequest;
import com.bentork.ev_system.dto.response.MaintenanceResponse;
import com.bentork.ev_system.service.interfaces.IMaintenanceService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST controller for maintenance schedule operations.
 * All endpoints require ADMIN authority.
 *
 * Dependency Inversion: depends on IMaintenanceService interface,
 * not the concrete MaintenanceService.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final IMaintenanceService maintenanceService;

    /**
     * Schedule maintenance for an entire station.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/station/{stationId}")
    public ResponseEntity<?> scheduleStationMaintenance(
            @PathVariable Long stationId,
            @RequestBody MaintenanceRequest request) {
        log.info("POST /api/maintenance/station/{} - start={}, end={}, reason={}",
                stationId, request.getScheduledStart(), request.getScheduledEnd(), request.getReason());
        try {
            MaintenanceResponse response = maintenanceService.scheduleStationMaintenance(stationId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (EntityNotFoundException e) {
            log.warn("Station not found: {}", stationId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid maintenance request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to schedule station maintenance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to schedule maintenance");
        }
    }

    /**
     * Schedule maintenance for a single charger.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/charger/{chargerId}")
    public ResponseEntity<?> scheduleChargerMaintenance(
            @PathVariable Long chargerId,
            @RequestBody MaintenanceRequest request) {
        log.info("POST /api/maintenance/charger/{} - start={}, end={}, reason={}",
                chargerId, request.getScheduledStart(), request.getScheduledEnd(), request.getReason());
        try {
            MaintenanceResponse response = maintenanceService.scheduleChargerMaintenance(chargerId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (EntityNotFoundException e) {
            log.warn("Charger not found: {}", chargerId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid maintenance request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to schedule charger maintenance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to schedule maintenance");
        }
    }

    /**
     * Cancel or end a maintenance schedule.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{scheduleId}/cancel")
    public ResponseEntity<?> cancelMaintenance(@PathVariable Long scheduleId) {
        log.info("PUT /api/maintenance/{}/cancel", scheduleId);
        try {
            MaintenanceResponse response = maintenanceService.cancelMaintenance(scheduleId);
            return ResponseEntity.ok(response);
        } catch (EntityNotFoundException e) {
            log.warn("Maintenance schedule not found: {}", scheduleId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            log.warn("Cannot cancel maintenance: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to cancel maintenance: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to cancel maintenance");
        }
    }

    /**
     * List all active and scheduled maintenance.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/active")
    public ResponseEntity<List<MaintenanceResponse>> getActiveMaintenance() {
        log.info("GET /api/maintenance/active");
        List<MaintenanceResponse> schedules = maintenanceService.getActiveAndScheduledMaintenance();
        return ResponseEntity.ok(schedules);
    }

    /**
     * Get maintenance history for a station.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/station/{stationId}")
    public ResponseEntity<List<MaintenanceResponse>> getMaintenanceByStation(
            @PathVariable Long stationId) {
        log.info("GET /api/maintenance/station/{}", stationId);
        return ResponseEntity.ok(maintenanceService.getMaintenanceByStation(stationId));
    }

    /**
     * Get maintenance history for a charger.
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/charger/{chargerId}")
    public ResponseEntity<List<MaintenanceResponse>> getMaintenanceByCharger(
            @PathVariable Long chargerId) {
        log.info("GET /api/maintenance/charger/{}", chargerId);
        return ResponseEntity.ok(maintenanceService.getMaintenanceByCharger(chargerId));
    }

    /**
     * Get full maintenance history, optionally filtered by status.
     * e.g. GET /api/maintenance/history?status=completed
     *      GET /api/maintenance/history?status=active
     *      GET /api/maintenance/history  (returns all)
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/history")
    public ResponseEntity<List<MaintenanceResponse>> getMaintenanceHistory(
            @RequestParam(required = false) String status) {
        log.info("GET /api/maintenance/history - status={}", status);
        return ResponseEntity.ok(maintenanceService.getMaintenanceHistory(status));
    }
}
