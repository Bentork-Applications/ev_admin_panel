package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.model.MaintenanceSchedule;
import com.bentork.ev_system.repository.MaintenanceScheduleRepository;
import com.bentork.ev_system.service.interfaces.IMaintenanceService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Background scheduler that automatically activates and completes
 * maintenance schedules based on their time windows.
 *
 * Runs every 60 seconds.
 *
 * Single Responsibility: ONLY responsible for the scheduling tick —
 * delegates all business logic to IMaintenanceService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceSchedulerService {

    private final MaintenanceScheduleRepository scheduleRepository;
    private final IMaintenanceService maintenanceService;

    /**
     * Periodic task that transitions maintenance schedules:
     *   SCHEDULED → ACTIVE  (when scheduledStart is reached)
     *   ACTIVE → COMPLETED  (when scheduledEnd is reached)
     */
    @Scheduled(fixedRate = 60000) // every 1 minute
    public void processMaintenanceSchedules() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Activate schedules whose start time has been reached
        List<MaintenanceSchedule> toActivate = scheduleRepository.findSchedulesToActivate(now);
        if (!toActivate.isEmpty()) {
            log.info("Activating {} maintenance schedule(s)", toActivate.size());
            for (MaintenanceSchedule schedule : toActivate) {
                try {
                    maintenanceService.activateSchedule(schedule);
                } catch (Exception e) {
                    log.error("Failed to activate maintenance schedule {}: {}",
                            schedule.getId(), e.getMessage(), e);
                }
            }
        }

        // 2. Complete schedules whose end time has been reached
        List<MaintenanceSchedule> toComplete = scheduleRepository.findSchedulesToComplete(now);
        if (!toComplete.isEmpty()) {
            log.info("Completing {} maintenance schedule(s)", toComplete.size());
            for (MaintenanceSchedule schedule : toComplete) {
                try {
                    maintenanceService.completeSchedule(schedule);
                } catch (Exception e) {
                    log.error("Failed to complete maintenance schedule {}: {}",
                            schedule.getId(), e.getMessage(), e);
                }
            }
        }
    }
}
