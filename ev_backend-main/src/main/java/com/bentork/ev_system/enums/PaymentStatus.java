package com.bentork.ev_system.enums;

/**
 * Enum representing payment statuses for orders.
 *
 * Status flow: PENDING -> PARTIAL -> PAID
 * - PENDING: No payment received (receivedAmount = 0)
 * - PARTIAL: Some payment received but pendingAmount > 0
 * - PAID: Fully paid (pendingAmount = 0)
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum PaymentStatus {

    PENDING("pending"),
    PARTIAL("partial"),
    PAID("paid");

    private final String value;

    PaymentStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to PaymentStatus enum (case-insensitive).
     */
    public static PaymentStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "pending":
                return PENDING;
            case "partial":
                return PARTIAL;
            case "paid":
                return PAID;
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

    @Override
    public String toString() {
        return value;
    }
}
