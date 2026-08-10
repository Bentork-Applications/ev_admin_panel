package com.bentork.ev_system.exception;

/**
 * Thrown when a user tries to book a slot that is already booked
 * or when a duplicate booking is detected.
 * 
 * This exception is caught by GlobalExceptionHandler and returns
 * HTTP 409 CONFLICT to the client.
 */
public class SlotAlreadyBookedException extends RuntimeException {

    private final Long slotId;

    public SlotAlreadyBookedException(Long slotId) {
        super("Slot " + slotId + " is already booked. Please choose another slot.");
        this.slotId = slotId;
    }

    public SlotAlreadyBookedException(Long slotId, String message) {
        super(message);
        this.slotId = slotId;
    }

    public Long getSlotId() {
        return slotId;
    }
}
