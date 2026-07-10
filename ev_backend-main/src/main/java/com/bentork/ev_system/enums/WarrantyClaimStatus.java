package com.bentork.ev_system.enums;

/**
 * Enum representing the lifecycle states of a battery warranty claim.
 *
 * Status flow:
 * request_created -> approved  -> product_received -> processing -> completed -> dispatched -> delivered -> user_confirmed -> closed
 * request_created -> rejected
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum WarrantyClaimStatus {

    REQUEST_CREATED("request_created"),
    APPROVED("approved"),
    REJECTED("rejected"),
    PRODUCT_RECEIVED("product_received"),
    PROCESSING("processing"),
    COMPLETED("completed"),
    DISPATCHED("dispatched"),
    DELIVERED("delivered"),
    USER_CONFIRMED("user_confirmed"),
    CLOSED("closed");

    private final String value;

    WarrantyClaimStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to WarrantyClaimStatus enum (case-insensitive).
     */
    public static WarrantyClaimStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "request_created":
                return REQUEST_CREATED;
            case "approved":
                return APPROVED;
            case "rejected":
                return REJECTED;
            case "product_received":
                return PRODUCT_RECEIVED;
            case "processing":
                return PROCESSING;
            case "completed":
                return COMPLETED;
            case "dispatched":
                return DISPATCHED;
            case "delivered":
                return DELIVERED;
            case "user_confirmed":
                return USER_CONFIRMED;
            case "closed":
                return CLOSED;
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
    public static boolean isValidTransition(WarrantyClaimStatus current, WarrantyClaimStatus next) {
        if (current == null || next == null) {
            return false;
        }

        switch (current) {
            case REQUEST_CREATED:
                return next == APPROVED || next == REJECTED;
            case APPROVED:
                return next == PRODUCT_RECEIVED;
            case PRODUCT_RECEIVED:
                return next == PROCESSING;
            case PROCESSING:
                return next == COMPLETED;
            case COMPLETED:
                return next == DISPATCHED;
            case DISPATCHED:
                return next == DELIVERED;
            case DELIVERED:
                return next == USER_CONFIRMED;
            case USER_CONFIRMED:
                return next == CLOSED;
            default:
                return false;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
