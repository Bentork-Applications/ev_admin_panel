package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a sales order.
 *
 * Status flow:
 * SALES_REGISTERED -> IN_PRODUCTION -> PRODUCTION_COMPLETE -> SCM_COMPLETE -> DISPATCHED
 * (Any non-terminal) -> CANCELLED
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum OrderStatus {

    SALES_REGISTERED("sales_registered"),
    IN_PRODUCTION("in_production"),
    PRODUCTION_COMPLETE("production_complete"),
    SCM_COMPLETE("scm_complete"),
    DISPATCHED("dispatched"),
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
            case "sales_registered":
                return SALES_REGISTERED;
            case "in_production":
                return IN_PRODUCTION;
            case "production_complete":
                return PRODUCTION_COMPLETE;
            case "scm_complete":
                return SCM_COMPLETE;
            case "dispatched":
                return DISPATCHED;
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

        // Cancelled and Dispatched are terminal states
        if (current == CANCELLED || current == DISPATCHED) {
            return false;
        }

        // Allowed to cancel from any non-terminal state
        if (next == CANCELLED) {
            return true;
        }

        switch (current) {
            case SALES_REGISTERED:
                return next == IN_PRODUCTION;
            case IN_PRODUCTION:
                return next == PRODUCTION_COMPLETE;
            case PRODUCTION_COMPLETE:
                return next == SCM_COMPLETE;
            case SCM_COMPLETE:
                return next == DISPATCHED;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
