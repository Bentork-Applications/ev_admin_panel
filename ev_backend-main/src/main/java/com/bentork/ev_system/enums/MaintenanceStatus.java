package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a maintenance schedule.
 *
 * Status flow:
 * scheduled → active   (scheduler detects scheduledStart reached)
 * scheduled → cancelled (admin cancels before start time)
 * active    → completed (scheduler detects scheduledEnd reached, or admin ends manually)
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum MaintenanceStatus {

    SCHEDULED("scheduled"),   // Future — not yet active
    ACTIVE("active"),         // Currently in maintenance
    COMPLETED("completed"),   // Ended (auto or manual)
    CANCELLED("cancelled");   // Admin cancelled before it started

    private final String value;

    MaintenanceStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to MaintenanceStatus enum (case-insensitive).
     */
    public static MaintenanceStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "scheduled":
                return SCHEDULED;
            case "active":
                return ACTIVE;
            case "completed":
                return COMPLETED;
            case "cancelled":
                return CANCELLED;
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

    @Override
    public String toString() {
        return value;
    }
}
