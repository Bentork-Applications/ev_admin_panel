package com.bentork.ev_system.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.MaintenanceSchedule;

@Repository
public interface MaintenanceScheduleRepository extends JpaRepository<MaintenanceSchedule, Long> {

    /**
     * Check if a charger is under ACTIVE maintenance right now.
     * Returns true if either:
     *   - The charger itself has an active maintenance schedule, OR
     *   - The charger's parent station has an active maintenance schedule.
     */
    @Query("SELECT COUNT(m) > 0 FROM MaintenanceSchedule m " +
           "WHERE (m.charger.id = :chargerId OR m.station.id = :stationId) " +
           "AND m.status = 'active'")
    boolean isChargerUnderMaintenance(@Param("chargerId") Long chargerId,
                                      @Param("stationId") Long stationId);

    /**
     * Check if a slot booking's time window overlaps any ACTIVE or SCHEDULED
     * maintenance schedule for a given charger (or its parent station).
     *
     * Overlap logic: slot.start < maintenance.end AND slot.end > maintenance.start
     */
    @Query("SELECT COUNT(m) > 0 FROM MaintenanceSchedule m " +
           "WHERE (m.charger.id = :chargerId OR m.station.id = :stationId) " +
           "AND m.status IN ('active', 'scheduled') " +
           "AND m.scheduledStart < :slotEnd " +
           "AND m.scheduledEnd > :slotStart")
    boolean hasMaintenanceOverlap(@Param("chargerId") Long chargerId,
                                  @Param("stationId") Long stationId,
                                  @Param("slotStart") LocalDateTime slotStart,
                                  @Param("slotEnd") LocalDateTime slotEnd);

    /**
     * Find schedules that should be activated now (SCHEDULED → ACTIVE).
     */
    @Query("SELECT m FROM MaintenanceSchedule m " +
           "WHERE m.status = 'scheduled' AND m.scheduledStart <= :now")
    List<MaintenanceSchedule> findSchedulesToActivate(@Param("now") LocalDateTime now);

    /**
     * Find schedules that should be completed now (ACTIVE → COMPLETED).
     */
    @Query("SELECT m FROM MaintenanceSchedule m " +
           "WHERE m.status = 'active' AND m.scheduledEnd <= :now")
    List<MaintenanceSchedule> findSchedulesToComplete(@Param("now") LocalDateTime now);

    /**
     * Find all maintenance schedules with given statuses.
     */
    List<MaintenanceSchedule> findByStatusIn(List<String> statuses);

    /**
     * Find maintenance schedules for a specific station.
     */
    List<MaintenanceSchedule> findByStationIdOrderByCreatedAtDesc(Long stationId);

    /**
     * Find maintenance schedules for a specific charger.
     */
    List<MaintenanceSchedule> findByChargerIdOrderByCreatedAtDesc(Long chargerId);

    /**
     * Find all maintenance schedules ordered by creation date descending (full history).
     */
    List<MaintenanceSchedule> findAllByOrderByCreatedAtDesc();

    /**
     * Find maintenance schedules filtered by status, ordered by creation date descending.
     */
    List<MaintenanceSchedule> findByStatusOrderByCreatedAtDesc(String status);
}
