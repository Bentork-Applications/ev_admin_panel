package com.bentork.ev_system.enums;

/**
 * Enum representing the status of a sales quotation.
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum QuotationStatus {

    DRAFT("draft"),
    SENT("sent"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    EXPIRED("expired");

    private final String value;

    QuotationStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string to QuotationStatus enum (case-insensitive).
     */
    public static QuotationStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "draft":
                return DRAFT;
            case "sent":
                return SENT;
            case "accepted":
                return ACCEPTED;
            case "rejected":
                return REJECTED;
            case "expired":
                return EXPIRED;
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
    public static boolean isValidTransition(QuotationStatus current, QuotationStatus next) {
        if (current == null || next == null) {
            return false;
        }

        // Terminal states
        if (current == ACCEPTED || current == REJECTED || current == EXPIRED) {
            return false;
        }

        switch (current) {
            case DRAFT:
                return next == SENT;
            case SENT:
                return next == ACCEPTED || next == REJECTED || next == EXPIRED;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
