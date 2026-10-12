package com.bentork.ev_system.enums;

/**
 * Enum representing the type of sales activity logged in the CRM.
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum ActivityType {

    CALL("call"),
    MEETING("meeting"),
    EMAIL("email"),
    FOLLOW_UP("follow_up"),
    NOTE("note");

    private final String value;

    ActivityType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string to ActivityType enum (case-insensitive).
     */
    public static ActivityType fromString(String type) {
        if (type == null) {
            return null;
        }

        String normalized = type.toLowerCase().trim();

        switch (normalized) {
            case "call":
                return CALL;
            case "meeting":
                return MEETING;
            case "email":
                return EMAIL;
            case "follow_up":
                return FOLLOW_UP;
            case "note":
                return NOTE;
            default:
                return null;
        }
    }

    /**
     * Check if type string matches this enum value (case-insensitive).
     */
    public boolean matches(String type) {
        if (type == null) {
            return false;
        }
        return this.value.equalsIgnoreCase(type.trim());
    }

    @Override
    public String toString() {
        return value;
    }
}
