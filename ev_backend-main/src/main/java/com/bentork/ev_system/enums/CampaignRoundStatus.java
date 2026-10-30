package com.bentork.ev_system.enums;

/**
 * Enum representing the status of an individual campaign messaging round.
 *
 * Status flow:
 * PENDING → SCHEDULED → IN_PROGRESS → COMPLETED
 * Any non-terminal → CANCELLED / PAUSED
 * PAUSED → IN_PROGRESS (resume)
 */
public enum CampaignRoundStatus {

    PENDING("PENDING"),
    SCHEDULED("SCHEDULED"),
    IN_PROGRESS("IN_PROGRESS"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED"),
    PAUSED("PAUSED");

    private final String value;

    CampaignRoundStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CampaignRoundStatus fromString(String status) {
        if (status == null) {
            return null;
        }
        String normalized = status.toUpperCase().trim();
        for (CampaignRoundStatus rs : values()) {
            if (rs.value.equals(normalized)) {
                return rs;
            }
        }
        return null;
    }

    public static boolean isValidTransition(CampaignRoundStatus current, CampaignRoundStatus next) {
        if (current == null || next == null) {
            return false;
        }
        if (current == COMPLETED || current == CANCELLED) {
            return false;
        }
        switch (current) {
            case PENDING:
                return next == SCHEDULED || next == IN_PROGRESS || next == CANCELLED;
            case SCHEDULED:
                return next == IN_PROGRESS || next == CANCELLED || next == PAUSED;
            case IN_PROGRESS:
                return next == COMPLETED || next == PAUSED || next == CANCELLED;
            case PAUSED:
                return next == IN_PROGRESS || next == CANCELLED;
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
