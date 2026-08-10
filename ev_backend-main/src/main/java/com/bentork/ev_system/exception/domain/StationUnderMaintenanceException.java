package com.bentork.ev_system.exception.domain;

/**
 * Thrown when a user attempts to start a session or book a slot
 * on a charger/station that is currently under maintenance.
 */
public class StationUnderMaintenanceException extends RuntimeException {

    public StationUnderMaintenanceException(Long targetId, String targetType) {
        super(capitalize(targetType) + " " + targetId +
                " is currently under maintenance. New sessions and bookings are temporarily unavailable.");
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) {
            return s;
        }
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }
}
