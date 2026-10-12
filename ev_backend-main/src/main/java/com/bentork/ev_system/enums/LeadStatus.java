package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a sales lead.
 *
 * Status flow:
 * NEW -> CONTACTED -> QUALIFIED -> CONVERTED
 *                  -> NURTURE (can re-enter CONTACTED)
 *                  -> LOST
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum LeadStatus {

    NEW("new"),
    CONTACTED("contacted"),
    QUALIFIED("qualified"),
    NURTURE("nurture"),
    CONVERTED("converted"),
    LOST("lost");

    private final String value;

    LeadStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to LeadStatus enum (case-insensitive).
     */
    public static LeadStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "new":
                return NEW;
            case "contacted":
                return CONTACTED;
            case "qualified":
                return QUALIFIED;
            case "nurture":
                return NURTURE;
            case "converted":
                return CONVERTED;
            case "lost":
                return LOST;
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
    public static boolean isValidTransition(LeadStatus current, LeadStatus next) {
        if (current == null || next == null) {
            return false;
        }

        // Converted and Lost are terminal states
        if (current == CONVERTED || current == LOST) {
            return false;
        }

        switch (current) {
            case NEW:
                return next == CONTACTED || next == LOST;
            case CONTACTED:
                return next == QUALIFIED || next == NURTURE || next == LOST;
            case QUALIFIED:
                return next == CONVERTED || next == LOST;
            case NURTURE:
                return next == CONTACTED || next == LOST;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
