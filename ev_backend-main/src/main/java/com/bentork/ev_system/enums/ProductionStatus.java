package com.bentork.ev_system.enums;

/**
 * Enum representing production stage statuses.
 *
 * Status flow: CONFIRM -> IN_PROGRESS -> TESTING -> COMPLETED
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum ProductionStatus {

    CONFIRM("confirm"),
    IN_PROGRESS("in_progress"),
    TESTING("testing"),
    COMPLETED("completed");

    private final String value;

    ProductionStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to ProductionStatus enum (case-insensitive).
     */
    public static ProductionStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "confirm":
                return CONFIRM;
            case "in_progress":
                return IN_PROGRESS;
            case "testing":
                return TESTING;
            case "completed":
                return COMPLETED;
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
     * Validates whether the transition from current to next status is allowed.
     */
    public static boolean isValidTransition(ProductionStatus current, ProductionStatus next) {
        if (current == null || next == null) {
            return false;
        }

        switch (current) {
            case CONFIRM:
                return next == IN_PROGRESS;
            case IN_PROGRESS:
                return next == TESTING;
            case TESTING:
                return next == COMPLETED;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
