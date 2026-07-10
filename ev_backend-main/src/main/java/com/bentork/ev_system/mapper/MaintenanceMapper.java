package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.response.MaintenanceResponse;
import com.bentork.ev_system.model.MaintenanceSchedule;

/**
 * Maps MaintenanceSchedule entity ↔ MaintenanceResponse DTO.
 *
 * Follows the Single Responsibility Principle: mapping logic is
 * separated from service/controller logic.
 */
public class MaintenanceMapper {

    private MaintenanceMapper() {
        // Utility class — prevent instantiation
    }

    /**
     * Convert a MaintenanceSchedule entity to a MaintenanceResponse DTO.
     */
    public static MaintenanceResponse toResponse(MaintenanceSchedule schedule) {
        MaintenanceResponse response = new MaintenanceResponse();
        response.setId(schedule.getId());
        response.setTargetType(schedule.getTargetType());
        response.setReason(schedule.getReason());
        response.setScheduledStart(schedule.getScheduledStart());
        response.setScheduledEnd(schedule.getScheduledEnd());
        response.setStatus(schedule.getStatus());
        response.setCreatedAt(schedule.getCreatedAt());

        if ("STATION".equals(schedule.getTargetType()) && schedule.getStation() != null) {
            response.setTargetId(schedule.getStation().getId());
            response.setTargetName(schedule.getStation().getName());
        } else if ("CHARGER".equals(schedule.getTargetType()) && schedule.getCharger() != null) {
            response.setTargetId(schedule.getCharger().getId());
            response.setTargetName(schedule.getCharger().getOcppId());
        }

        if (schedule.getCreatedByAdmin() != null) {
            response.setCreatedByAdminName(schedule.getCreatedByAdmin().getName());
        }

        return response;
    }
}
