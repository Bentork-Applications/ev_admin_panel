package com.bentork.ev_system.enums;

/**
 * Enum representing the delivery status of an individual WhatsApp message.
 *
 * Status progression (can only advance, never regress):
 * QUEUED → SUBMITTED → SENT → DELIVERED → READ
 * Any stage can transition to FAILED
 * SKIPPED is set before submission when eligibility fails
 * UNDELIVERABLE is set when the provider confirms permanent failure
 */
public enum MessageStatus {

    QUEUED("QUEUED"),
    SUBMITTED("SUBMITTED"),
    SENT("SENT"),
    DELIVERED("DELIVERED"),
    READ("READ"),
    FAILED("FAILED"),
    SKIPPED("SKIPPED"),
    UNDELIVERABLE("UNDELIVERABLE");

    private final String value;

    MessageStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static MessageStatus fromString(String status) {
        if (status == null) {
            return null;
        }
        String normalized = status.toUpperCase().trim();
        for (MessageStatus ms : values()) {
            if (ms.value.equals(normalized)) {
                return ms;
            }
        }
        return null;
    }

    /**
     * Returns the ordinal progression rank. Higher = more advanced.
     * Used to prevent status regression from out-of-order webhooks.
     */
    public int progressionRank() {
        switch (this) {
            case QUEUED: return 0;
            case SUBMITTED: return 1;
            case SENT: return 2;
            case DELIVERED: return 3;
            case READ: return 4;
            case FAILED: return -1;
            case SKIPPED: return -2;
            case UNDELIVERABLE: return -3;
            default: return -99;
        }
    }

    /**
     * Check if transitioning from current to next is valid (no regression).
     */
    public static boolean canAdvanceTo(MessageStatus current, MessageStatus next) {
        if (current == null || next == null) {
            return false;
        }
        // Terminal states: SKIPPED, UNDELIVERABLE cannot advance
        if (current == SKIPPED || current == UNDELIVERABLE) {
            return false;
        }
        // FAILED can be retried (goes back to QUEUED)
        if (current == FAILED && next == QUEUED) {
            return true;
        }
        // Normal progression: only advance
        if (next.progressionRank() < 0) {
            // Transitioning to a failure/skip state is always allowed (except from terminal)
            return true;
        }
        return next.progressionRank() > current.progressionRank();
    }

    public boolean isTerminal() {
        return this == SKIPPED || this == UNDELIVERABLE;
    }

    public boolean isSuccessful() {
        return this == SENT || this == DELIVERED || this == READ;
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
