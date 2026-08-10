package com.bentork.ev_system.exception;

/**
 * Thrown when a user action requires consent that has not been provided.
 * Maps to HTTP 422 (Unprocessable Entity).
 */
public class ConsentRequiredException extends RuntimeException {

    public ConsentRequiredException(String message) {
        super(message);
    }
}
