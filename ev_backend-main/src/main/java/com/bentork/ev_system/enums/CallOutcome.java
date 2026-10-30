package com.bentork.ev_system.enums;

/**
 * Enum representing the outcome of a sales call activity.
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum CallOutcome {

    INTERESTED("interested"),
    CALL_BACK("call_back"),
    NO_ANSWER("no_answer"),
    NOT_INTERESTED("not_interested"),
    MEETING_SCHEDULED("meeting_scheduled"),
    WRONG_NUMBER("wrong_number");

    private final String value;

    CallOutcome(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string to CallOutcome enum (case-insensitive).
     */
    public static CallOutcome fromString(String outcome) {
        if (outcome == null) {
            return null;
        }

        String normalized = outcome.toLowerCase().trim();

        switch (normalized) {
            case "interested":
                return INTERESTED;
            case "call_back":
                return CALL_BACK;
            case "no_answer":
                return NO_ANSWER;
            case "not_interested":
                return NOT_INTERESTED;
            case "meeting_scheduled":
                return MEETING_SCHEDULED;
            case "wrong_number":
                return WRONG_NUMBER;
            default:
                return null;
        }
    }

    /**
     * Check if outcome string matches this enum value (case-insensitive).
     */
    public boolean matches(String outcome) {
        if (outcome == null) {
            return false;
        }
        return this.value.equalsIgnoreCase(outcome.trim());
    }

    @Override
    public String toString() {
        return value;
    }
}
