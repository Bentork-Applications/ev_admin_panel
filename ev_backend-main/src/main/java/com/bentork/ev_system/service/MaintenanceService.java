package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.MaintenanceRequest;
import com.bentork.ev_system.dto.response.MaintenanceResponse;
import com.bentork.ev_system.enums.BookingStatus;
import com.bentork.ev_system.enums.ChargerStatus;
import com.bentork.ev_system.enums.MaintenanceStatus;
import com.bentork.ev_system.mapper.MaintenanceMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.MaintenanceSchedule;
import com.bentork.ev_system.model.Slot;
import com.bentork.ev_system.model.SlotBooking;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.MaintenanceScheduleRepository;
import com.bentork.ev_system.repository.SlotBookingRepository;
import com.bentork.ev_system.repository.SlotRepository;
import com.bentork.ev_system.repository.StationRepository;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import com.bentork.ev_system.service.interfaces.IMaintenanceService;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Core maintenance logic — schedule, activate, complete, cancel.
 *
 * Single Responsibility: Handles ONLY maintenance lifecycle and guards.
 * Open/Closed: New target types (e.g., CONNECTOR) can be added without
 *              modifying existing code — just add a new scheduling method.
 * Dependency Inversion: Depends on IAdminNotificationService and
 *                       IUserNotificationService abstractions, not concretes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceService implements IMaintenanceService {

    private final MaintenanceScheduleRepository scheduleRepository;
    private final StationRepository stationRepository;
    private final ChargerRepository chargerRepository;
    private final SlotBookingRepository slotBookingRepository;
    private final SlotRepository slotRepository;
    private final AdminRepository adminRepository;
    private final IAdminNotificationService adminNotificationService;
    private final IUserNotificationService userNotificationService;

    // ==================== SCHEDULING ====================

    @Override
    @Transactional
    public MaintenanceResponse scheduleStationMaintenance(Long stationId, MaintenanceRequest request) {
        log.info("Scheduling station maintenance: stationId={}, start={}, end={}",
                stationId, request.getScheduledStart(), request.getScheduledEnd());

        validateTimeWindow(request);

        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + stationId));

        // Determine initial status based on start time
        LocalDateTime now = LocalDateTime.now();
        String initialStatus = !request.getScheduledStart().isAfter(now)
                ? MaintenanceStatus.ACTIVE.getValue()
                : MaintenanceStatus.SCHEDULED.getValue();

        // Create schedule
        MaintenanceSchedule schedule = new MaintenanceSchedule();
        schedule.setStation(station);
        schedule.setTargetType("STATION");
        schedule.setReason(request.getReason());
        schedule.setScheduledStart(request.getScheduledStart());
        schedule.setScheduledEnd(request.getScheduledEnd());
        schedule.setStatus(initialStatus);
        schedule.setCreatedByAdmin(resolveCurrentAdmin());
        scheduleRepository.save(schedule);

        // Cancel overlapping bookings on ALL chargers of this station
        List<Charger> chargers = chargerRepository.findByStationId(stationId);
        int totalCancelled = 0;
        for (Charger charger : chargers) {
            totalCancelled += cancelOverlappingBookings(
                    charger.getId(), request.getScheduledStart(), request.getScheduledEnd());
        }

        // If immediately active, mark chargers offline
        if (MaintenanceStatus.ACTIVE.matches(initialStatus)) {
            markChargersOffline(chargers);
            log.info("Station {} maintenance activated immediately", stationId);
        }

        // Notify admins
        String statusLabel = MaintenanceStatus.ACTIVE.matches(initialStatus) ? "activated" : "scheduled";
        adminNotificationService.createSystemNotification(
                "Station '" + station.getName() + "' maintenance " + statusLabel +
                        " from " + request.getScheduledStart() + " to " + request.getScheduledEnd() +
                        ". Reason: " + request.getReason(),
                "MAINTENANCE_" + statusLabel.toUpperCase());

        log.info("Station maintenance {} created: scheduleId={}, status={}, cancelledBookings={}",
                statusLabel, schedule.getId(), initialStatus, totalCancelled);

        MaintenanceResponse response = MaintenanceMapper.toResponse(schedule);
        response.setCancelledBookingsCount(totalCancelled);
        return response;
    }

    @Override
    @Transactional
    public MaintenanceResponse scheduleChargerMaintenance(Long chargerId, MaintenanceRequest request) {
        log.info("Scheduling charger maintenance: chargerId={}, start={}, end={}",
                chargerId, request.getScheduledStart(), request.getScheduledEnd());

        validateTimeWindow(request);

        Charger charger = chargerRepository.findById(chargerId)
                .orElseThrow(() -> new EntityNotFoundException("Charger not found with ID: " + chargerId));

        // Determine initial status
        LocalDateTime now = LocalDateTime.now();
        String initialStatus = !request.getScheduledStart().isAfter(now)
                ? MaintenanceStatus.ACTIVE.getValue()
                : MaintenanceStatus.SCHEDULED.getValue();

        // Create schedule
        MaintenanceSchedule schedule = new MaintenanceSchedule();
        schedule.setCharger(charger);
        schedule.setTargetType("CHARGER");
        schedule.setReason(request.getReason());
        schedule.setScheduledStart(request.getScheduledStart());
        schedule.setScheduledEnd(request.getScheduledEnd());
        schedule.setStatus(initialStatus);
        schedule.setCreatedByAdmin(resolveCurrentAdmin());
        scheduleRepository.save(schedule);

        // Cancel overlapping bookings on this charger only
        int cancelledCount = cancelOverlappingBookings(
                chargerId, request.getScheduledStart(), request.getScheduledEnd());

        // If immediately active, mark this charger offline
        if (MaintenanceStatus.ACTIVE.matches(initialStatus)) {
            markChargersOffline(List.of(charger));
            log.info("Charger {} maintenance activated immediately", chargerId);
        }

        // Notify admins
        String statusLabel = MaintenanceStatus.ACTIVE.matches(initialStatus) ? "activated" : "scheduled";
        adminNotificationService.createSystemNotification(
                "Charger '" + charger.getOcppId() + "' maintenance " + statusLabel +
                        " from " + request.getScheduledStart() + " to " + request.getScheduledEnd() +
                        ". Reason: " + request.getReason(),
                "MAINTENANCE_" + statusLabel.toUpperCase());

        log.info("Charger maintenance {} created: scheduleId={}, status={}, cancelledBookings={}",
                statusLabel, schedule.getId(), initialStatus, cancelledCount);

        MaintenanceResponse response = MaintenanceMapper.toResponse(schedule);
        response.setCancelledBookingsCount(cancelledCount);
        return response;
    }

    // ==================== CANCEL / END ====================

    @Override
    @Transactional
    public MaintenanceResponse cancelMaintenance(Long scheduleId) {
        log.info("Cancelling maintenance: scheduleId={}", scheduleId);

        MaintenanceSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Maintenance schedule not found with ID: " + scheduleId));

        if (MaintenanceStatus.COMPLETED.matches(schedule.getStatus())
                || MaintenanceStatus.CANCELLED.matches(schedule.getStatus())) {
            throw new IllegalStateException(
                    "Cannot cancel maintenance with status '" + schedule.getStatus() +
                            "'. Only 'scheduled' or 'active' maintenance can be cancelled.");
        }

        if (MaintenanceStatus.SCHEDULED.matches(schedule.getStatus())) {
            // Not yet started — simply cancel
            schedule.setStatus(MaintenanceStatus.CANCELLED.getValue());
            log.info("Scheduled maintenance cancelled: scheduleId={}", scheduleId);
        } else {
            // Currently active — end it early
            schedule.setStatus(MaintenanceStatus.COMPLETED.getValue());
            log.info("Active maintenance ended early: scheduleId={}", scheduleId);
            // NOTE: Charger status will be restored by the next OCPP StatusNotification
        }

        scheduleRepository.save(schedule);

        // Notify admins
        adminNotificationService.createSystemNotification(
                "Maintenance schedule #" + scheduleId + " has been " + schedule.getStatus() + ".",
                "MAINTENANCE_" + schedule.getStatus().toUpperCase());

        return MaintenanceMapper.toResponse(schedule);
    }

    // ==================== SCHEDULER CALLBACKS ====================

    @Override
    @Transactional
    public void activateSchedule(MaintenanceSchedule schedule) {
        log.info("Activating scheduled maintenance: scheduleId={}, targetType={}, targetId={}",
                schedule.getId(), schedule.getTargetType(),
                schedule.getStation() != null ? schedule.getStation().getId() : schedule.getCharger().getId());

        schedule.setStatus(MaintenanceStatus.ACTIVE.getValue());
        scheduleRepository.save(schedule);

        // Mark chargers offline
        if ("STATION".equals(schedule.getTargetType()) && schedule.getStation() != null) {
            List<Charger> chargers = chargerRepository.findByStationId(schedule.getStation().getId());
            markChargersOffline(chargers);
        } else if ("CHARGER".equals(schedule.getTargetType()) && schedule.getCharger() != null) {
            markChargersOffline(List.of(schedule.getCharger()));
        }

        adminNotificationService.createSystemNotification(
                "Scheduled maintenance #" + schedule.getId() + " is now ACTIVE.",
                "MAINTENANCE_ACTIVATED");

        log.info("Maintenance schedule {} activated", schedule.getId());
    }

    @Override
    @Transactional
    public void completeSchedule(MaintenanceSchedule schedule) {
        log.info("Completing maintenance: scheduleId={}", schedule.getId());

        schedule.setStatus(MaintenanceStatus.COMPLETED.getValue());
        scheduleRepository.save(schedule);

        // NOTE: Do NOT manually set chargers to available here.
        // The next OCPP StatusNotification from the charger hardware will
        // restore the correct real-time status.

        adminNotificationService.createSystemNotification(
                "Maintenance schedule #" + schedule.getId() + " has COMPLETED.",
                "MAINTENANCE_COMPLETED");

        log.info("Maintenance schedule {} completed", schedule.getId());
    }

    // ==================== GUARD CHECKS ====================

    @Override
    public boolean isChargerUnderMaintenance(Long chargerId) {
        Charger charger = chargerRepository.findById(chargerId).orElse(null);
        if (charger == null) {
            return false;
        }
        Long stationId = charger.getStation().getId();
        return scheduleRepository.isChargerUnderMaintenance(chargerId, stationId);
    }

    @Override
    public boolean hasMaintenanceOverlap(Long chargerId, LocalDateTime slotStart, LocalDateTime slotEnd) {
        Charger charger = chargerRepository.findById(chargerId).orElse(null);
        if (charger == null) {
            return false;
        }
        Long stationId = charger.getStation().getId();
        return scheduleRepository.hasMaintenanceOverlap(chargerId, stationId, slotStart, slotEnd);
    }

    // ==================== LISTING ====================

    @Override
    public List<MaintenanceResponse> getActiveAndScheduledMaintenance() {
        List<String> statuses = List.of(
                MaintenanceStatus.ACTIVE.getValue(),
                MaintenanceStatus.SCHEDULED.getValue());
        return scheduleRepository.findByStatusIn(statuses).stream()
                .map(MaintenanceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<MaintenanceResponse> getMaintenanceByStation(Long stationId) {
        return scheduleRepository.findByStationIdOrderByCreatedAtDesc(stationId).stream()
                .map(MaintenanceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<MaintenanceResponse> getMaintenanceByCharger(Long chargerId) {
        return scheduleRepository.findByChargerIdOrderByCreatedAtDesc(chargerId).stream()
                .map(MaintenanceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<MaintenanceResponse> getMaintenanceHistory(String status) {
        List<MaintenanceSchedule> schedules;
        if (status != null && !status.isBlank()) {
            schedules = scheduleRepository.findByStatusOrderByCreatedAtDesc(status.toLowerCase().trim());
        } else {
            schedules = scheduleRepository.findAllByOrderByCreatedAtDesc();
        }
        return schedules.stream()
                .map(MaintenanceMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Resolve the currently authenticated admin from the security context.
     * Returns null if not authenticated or if the user is not an admin.
     */
    private Admin resolveCurrentAdmin() {
        try {
            String email = SecurityContextHolder.getContext()
                    .getAuthentication().getName();
            return adminRepository.findByEmail(email).orElse(null);
        } catch (Exception e) {
            log.warn("Could not resolve current admin: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Validates that the maintenance time window is valid.
     */
    private void validateTimeWindow(MaintenanceRequest request) {
        if (request.getScheduledStart() == null || request.getScheduledEnd() == null) {
            throw new IllegalArgumentException("scheduledStart and scheduledEnd are required.");
        }
        if (!request.getScheduledStart().isBefore(request.getScheduledEnd())) {
            throw new IllegalArgumentException("scheduledStart must be before scheduledEnd.");
        }
        if (request.getScheduledEnd().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("scheduledEnd cannot be in the past.");
        }
    }

    /**
     * Cancel ONLY the slot bookings that overlap with the maintenance window.
     * Bookings outside the window are untouched.
     */
    private int cancelOverlappingBookings(Long chargerId,
            LocalDateTime maintStart, LocalDateTime maintEnd) {
        List<SlotBooking> overlapping = slotBookingRepository
                .findOverlappingBookedSlots(chargerId, maintStart, maintEnd);

        for (SlotBooking booking : overlapping) {
            // Cancel the booking
            booking.setStatus(BookingStatus.CANCELLED.getValue());
            slotBookingRepository.save(booking);

            // Release the slot
            Slot slot = booking.getSlot();
            slot.setBooked(false);
            slotRepository.save(slot);

            // Notify the affected user
            userNotificationService.createNotification(
                    booking.getUser().getId(),
                    "Booking Cancelled — Maintenance",
                    "Your booking from " + slot.getStartTime() + " to " + slot.getEndTime() +
                            " was cancelled due to scheduled maintenance: " +
                            (booking.getCharger() != null ? booking.getCharger().getOcppId() : "station"),
                    "MAINTENANCE");

            log.info("Cancelled overlapping booking: bookingId={}, userId={}, slotId={}",
                    booking.getId(), booking.getUser().getId(), slot.getId());
        }

        return overlapping.size();
    }

    /**
     * Mark chargers as offline during active maintenance.
     */
    private void markChargersOffline(List<Charger> chargers) {
        for (Charger charger : chargers) {
            charger.setStatus(ChargerStatus.OFFLINE.getValue());
            charger.setAvailability(false);
            chargerRepository.save(charger);
            log.debug("Charger {} marked offline for maintenance", charger.getOcppId());
        }
    }
}
