package com.bentork.ev_system.exception.domain;

/**
 * Thrown when a user attempts to start a charging session on a charger
 * that is currently reserved by another user via a slot booking.
 *
 * This exception is caught by GlobalExceptionHandler and returns
 * HTTP 403 FORBIDDEN to the client.
 */
public class SlotReservedException extends RuntimeException {

    private final Long chargerId;
    private final Long bookingOwnerUserId;

    public SlotReservedException(Long chargerId, Long bookingOwnerUserId, String timeRange) {
        super("This charger is reserved by another user for " + timeRange
                + ". Please choose another charger or wait until the reservation ends.");
        this.chargerId = chargerId;
        this.bookingOwnerUserId = bookingOwnerUserId;
    }

    public Long getChargerId() {
        return chargerId;
    }

    public Long getBookingOwnerUserId() {
        return bookingOwnerUserId;
    }
}
