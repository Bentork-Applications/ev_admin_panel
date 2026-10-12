package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a support request.
 * 
 * Status flow:
 * pending -> approved -> in_progress -> completed
 * 
 * All values are stored in LOWERCASE for consistency.
 */
public enum RequestStatus {

    PENDING("pending"),
    APPROVED("approved"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed");

    private final String value;

    RequestStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to RequestStatus enum (case-insensitive).
     */
    public static RequestStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "pending":
                return PENDING;
            case "approved":
                return APPROVED;
            case "in_progress":
                return IN_PROGRESS;
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

    @Override
    public String toString() {
        return value;
    }
}
