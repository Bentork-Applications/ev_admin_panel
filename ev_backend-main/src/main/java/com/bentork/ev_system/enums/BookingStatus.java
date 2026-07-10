package com.bentork.ev_system.enums;

/**
 * Enum representing all possible slot booking statuses.
 * This ensures consistent status values across the entire codebase.
 * 
 * Status flow:
 * booked -> completed (user started a session)
 * booked -> cancelled (user cancelled the booking)
 * booked -> expired (user didn't show up, auto-expired by scheduler)
 * 
 * All values are stored in LOWERCASE for consistency.
 */
public enum BookingStatus {

    BOOKED("booked"), // Slot is reserved by user
    CANCELLED("cancelled"), // User cancelled the booking
    COMPLETED("completed"), // User showed up and started charging
    EXPIRED("expired"); // Booking expired (user didn't show up)

    private final String value;

    BookingStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string status to BookingStatus enum (case-insensitive).
     */
    public static BookingStatus fromString(String status) {
        if (status == null) {
            return null;
        }

        String normalized = status.toLowerCase().trim();

        switch (normalized) {
            case "booked":
                return BOOKED;
            case "cancelled":
                return CANCELLED;
            case "completed":
                return COMPLETED;
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
     * Check if booking is still active (not yet used or expired).
     */
    public static boolean isActiveBooking(String status) {
        return BOOKED.matches(status);
    }

    /**
     * Check if booking has ended (completed, cancelled, or expired).
     */
    public static boolean isEndedBooking(String status) {
        return COMPLETED.matches(status) || CANCELLED.matches(status) || EXPIRED.matches(status);
    }

    @Override
    public String toString() {
        return value;
    }
}
