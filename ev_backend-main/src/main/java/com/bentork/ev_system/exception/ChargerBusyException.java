package com.bentork.ev_system.exception;

/**
 * Thrown when a user tries to start a charging session on a charger
 * that already has an active or initiated session.
 * 
 * This exception is caught by GlobalExceptionHandler and returns
 * HTTP 409 CONFLICT to the client.
 */
public class ChargerBusyException extends RuntimeException {

    private final Long chargerId;

    public ChargerBusyException(Long chargerId) {
        super("Charger " + chargerId + " is currently in use. Please wait or choose another charger.");
        this.chargerId = chargerId;
    }

    public ChargerBusyException(Long chargerId, String message) {
        super(message);
        this.chargerId = chargerId;
    }

    public Long getChargerId() {
        return chargerId;
    }
}
