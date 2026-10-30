package com.bentork.ev_system.enums;

/**
 * Enum representing the stages of a sales opportunity pipeline.
 *
 * Stage flow:
 * QUALIFIED -> REQUIREMENT -> PROPOSAL -> NEGOTIATION -> WON
 *                                                     -> LOST
 *
 * Each stage has an associated probability weight.
 * All values are stored in LOWERCASE for consistency.
 */
public enum OpportunityStage {

    QUALIFIED("qualified", 20),
    REQUIREMENT("requirement", 40),
    PROPOSAL("proposal", 60),
    NEGOTIATION("negotiation", 80),
    WON("won", 100),
    LOST("lost", 0);

    private final String value;
    private final int probability;

    OpportunityStage(String value, int probability) {
        this.value = value;
        this.probability = probability;
    }

    public String getValue() {
        return value;
    }

    public int getProbability() {
        return probability;
    }

    /**
     * Convert a string to OpportunityStage enum (case-insensitive).
     */
    public static OpportunityStage fromString(String stage) {
        if (stage == null) {
            return null;
        }

        String normalized = stage.toLowerCase().trim();

        switch (normalized) {
            case "qualified":
                return QUALIFIED;
            case "requirement":
                return REQUIREMENT;
            case "proposal":
                return PROPOSAL;
            case "negotiation":
                return NEGOTIATION;
            case "won":
                return WON;
            case "lost":
                return LOST;
            default:
                return null;
        }
    }

    /**
     * Check if stage string matches this enum value (case-insensitive).
     */
    public boolean matches(String stage) {
        if (stage == null) {
            return false;
        }
        return this.value.equalsIgnoreCase(stage.trim());
    }

    /**
     * Validates whether the transition from current to next stage is allowed.
     */
    public static boolean isValidTransition(OpportunityStage current, OpportunityStage next) {
        if (current == null || next == null) {
            return false;
        }

        // Won and Lost are terminal states
        if (current == WON || current == LOST) {
            return false;
        }

        // Can mark as LOST from any active stage
        if (next == LOST) {
            return true;
        }

        switch (current) {
            case QUALIFIED:
                return next == REQUIREMENT;
            case REQUIREMENT:
                return next == PROPOSAL;
            case PROPOSAL:
                return next == NEGOTIATION;
            case NEGOTIATION:
                return next == WON;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
