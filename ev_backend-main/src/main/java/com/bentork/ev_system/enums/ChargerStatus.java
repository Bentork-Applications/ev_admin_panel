package com.bentork.ev_system.enums;

/**
 * Enum representing charger status values.
 * 
 * Status values:
 * - BUSY: Charger is currently in use (active session)
 * - AVAILABLE: Charger is connected and ready to use
 * - OFFLINE: Charger is disconnected from the system
 * - FAULTED: Charger has an error/fault condition
 */
public enum ChargerStatus {

    BUSY("busy"), // Active charging session
    AVAILABLE("available"), // Connected and ready
    OFFLINE("offline"), // Disconnected
    FAULTED("faulted"); // Error/fault condition

    private final String value;

    ChargerStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to ChargerStatus enum (case-insensitive).
     */
    public static ChargerStatus fromString(String status) {
        if (status == null) {
            return OFFLINE;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            // BUSY: Active session, reserved, preparing, or finishing
            case "busy":
            case "occupied":
            case "charging":
            case "preparing":
            case "finishing":
            case "reserved":
                return BUSY;
            case "available":
                return AVAILABLE;
            // Faulted status from OCPP (emergency button, non-earth switch, etc.)
            case "faulted":
            case "error":
                return FAULTED;
            // OFFLINE: Unavailable, suspended states, disconnected
            case "offline":
            case "unavailable":
            case "suspendedevse":
            case "suspendedev":
            default:
                return OFFLINE;
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
