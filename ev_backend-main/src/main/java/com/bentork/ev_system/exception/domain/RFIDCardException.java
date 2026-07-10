package com.bentork.ev_system.exception.domain;

public class RFIDCardException extends RuntimeException {

    public RFIDCardException(String reason) {
        super("RFID card error: " + reason);
    }

    public static RFIDCardException invalid(String cardNumber) {
        return new RFIDCardException("Invalid RFID card: " + cardNumber);
    }

    public static RFIDCardException inactive(String cardNumber) {
        return new RFIDCardException("Card is not active: " + cardNumber);
    }
}
