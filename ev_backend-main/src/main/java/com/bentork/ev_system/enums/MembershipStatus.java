package com.bentork.ev_system.enums;

/**
 * Enum representing the eligibility status of a lead's membership in a campaign.
 *
 * A lead can be in one of these states within any given campaign:
 * ELIGIBLE → PAUSED → ELIGIBLE (resume)
 * ELIGIBLE → OPTED_OUT (permanent, from reply or manual)
 * ELIGIBLE → CONVERTED (lead was converted)
 * ELIGIBLE → DISQUALIFIED (lead was lost/disqualified)
 * ELIGIBLE → SUPPRESSED (global suppression applied)
 */
public enum MembershipStatus {

    ELIGIBLE("ELIGIBLE"),
    PAUSED("PAUSED"),
    OPTED_OUT("OPTED_OUT"),
    CONVERTED("CONVERTED"),
    DISQUALIFIED("DISQUALIFIED"),
    SUPPRESSED("SUPPRESSED");

    private final String value;

    MembershipStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MembershipStatus fromString(String status) {
        if (status == null) {
            return null;
        }
        String normalized = status.toUpperCase().trim();
        for (MembershipStatus ms : values()) {
            if (ms.value.equals(normalized)) {
                return ms;
            }
        }
        return null;
    }

    /**
     * Check if a lead with this status can receive campaign messages.
     */
    public boolean canReceiveMessages() {
        return this == ELIGIBLE;
    }

    /**
     * Check if a lead with this status can be resumed.
     */
    public boolean canResume() {
        return this == PAUSED;
    }

    /**
     * Check if this is a terminal status (cannot be changed back to ELIGIBLE).
     */
    public boolean isTerminal() {
        return this == OPTED_OUT || this == CONVERTED || this == DISQUALIFIED;
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
