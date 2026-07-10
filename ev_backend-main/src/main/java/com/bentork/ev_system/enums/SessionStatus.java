package com.bentork.ev_system.enums;

/**
 * Enum representing all possible session statuses.
 * This ensures consistent status values across the entire codebase.
 * 
 * Status flow:
 * initiated -> active -> completed
 * -> failed (if charger offline or error)
 * 
 * All values are stored in LOWERCASE for consistency.
 */
public enum SessionStatus {

    INITIATED("initiated"), // Session created, waiting for charger to start
    ACTIVE("active"), // Charging in progress
    COMPLETED("completed"), // Charging finished successfully
    FAILED("failed"); // Session failed (charger offline, error, etc.)

    private final String value;

    SessionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to SessionStatus enum (case-insensitive).
     * This handles legacy data that might have different casing.
     */
    public static SessionStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        // Handle legacy values with different casing
        switch (normalized) {
            case "initiated":
                return INITIATED;
            case "active":
                return ACTIVE;
            case "completed":
                return COMPLETED;
            case "failed":
            case "error":
                return FAILED;
            default:
                return null;
        }
    }

    /**
     * Check if status string matches this enum value (case-insensitive).
     */
    public boolean matches(String status) {
        if (status == null) {
            return false;
        }
        return this.value.equalsIgnoreCase(status.trim());
    }

    /**
     * Check if status is an active/in-progress status.
     */
    public static boolean isActiveStatus(String status) {
        return ACTIVE.matches(status) || INITIATED.matches(status);
    }

    /**
     * Check if status indicates session has ended.
     */
    public static boolean isEndedStatus(String status) {
        return COMPLETED.matches(status) || FAILED.matches(status);
    }

    @Override
    public String toString() {
        return value;
    }
}
