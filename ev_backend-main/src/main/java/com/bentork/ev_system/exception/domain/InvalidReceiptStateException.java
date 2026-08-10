package com.bentork.ev_system.exception.domain;

public class InvalidReceiptStateException extends RuntimeException {

    public InvalidReceiptStateException(Long receiptId, String expectedStatus) {
        super("Receipt " + receiptId + " is not in " + expectedStatus + " state");
    }
}
