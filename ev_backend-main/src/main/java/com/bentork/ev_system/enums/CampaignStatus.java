package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a WhatsApp campaign.
 *
 * Status flow:
 * DRAFT → SCHEDULED → ACTIVE → PAUSED → ACTIVE (resume)
 * ACTIVE → COMPLETED
 * DRAFT / SCHEDULED / ACTIVE → CANCELLED
 *
 * All values are stored in UPPERCASE for consistency.
 */
public enum CampaignStatus {

    DRAFT("DRAFT"),
    SCHEDULED("SCHEDULED"),
    ACTIVE("ACTIVE"),
    PAUSED("PAUSED"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED");

    private final String value;

    CampaignStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to CampaignStatus enum (case-insensitive).
     */
    public static CampaignStatus fromString(String status) {
        if (status == null) {
            return null;
        }
        String normalized = status.toUpperCase().trim();
        for (CampaignStatus cs : values()) {
            if (cs.value.equals(normalized)) {
                return cs;
            }
        }
        return null;
    }

    /**
     * Validates whether the transition from current to next status is allowed.
     */
    public static boolean isValidTransition(CampaignStatus current, CampaignStatus next) {
        if (current == null || next == null) {
            return false;
        }

        // Terminal states
        if (current == COMPLETED || current == CANCELLED) {
            return false;
        }

        switch (current) {
            case DRAFT:
                return next == SCHEDULED || next == ACTIVE || next == CANCELLED;
            case SCHEDULED:
                return next == ACTIVE || next == CANCELLED;
            case ACTIVE:
                return next == PAUSED || next == COMPLETED || next == CANCELLED;
            case PAUSED:
                return next == ACTIVE || next == CANCELLED;
            default:
                return false;
        }
    }

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
