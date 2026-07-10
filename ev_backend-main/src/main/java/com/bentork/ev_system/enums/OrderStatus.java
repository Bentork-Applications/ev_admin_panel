package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of an order.
 *
 * Status flow:
 * PENDING -> IN_PROGRESS -> TESTING -> COMPLETED -> DISPATCHED -> DELIVERED
 * (Any non-terminal) -> CANCELLED
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum OrderStatus {

    PENDING("pending"),
    IN_PROGRESS("in_progress"),
    TESTING("testing"),
    COMPLETED("completed"),
    DISPATCHED("dispatched"),
    DELIVERED("delivered"),
    CANCELLED("cancelled");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to OrderStatus enum (case-insensitive).
     */
    public static OrderStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "pending":
                return PENDING;
            case "in_progress":
                return IN_PROGRESS;
            case "testing":
                return TESTING;
            case "completed":
                return COMPLETED;
            case "dispatched":
                return DISPATCHED;
            case "delivered":
                return DELIVERED;
            case "cancelled":
                return CANCELLED;
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
    public static boolean isValidTransition(OrderStatus current, OrderStatus next) {
        if (current == null || next == null) {
            return false;
        }

        // Cancelled and Delivered are terminal states
        if (current == CANCELLED || current == DELIVERED) {
            return false;
        }
        
        // Allowed to cancel from any non-terminal state
        if (next == CANCELLED) {
            return true;
        }

        switch (current) {
            case PENDING:
                return next == IN_PROGRESS;
            case IN_PROGRESS:
                return next == TESTING;
            case TESTING:
                return next == COMPLETED;
            case COMPLETED:
                return next == DISPATCHED;
            case DISPATCHED:
                return next == DELIVERED;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
