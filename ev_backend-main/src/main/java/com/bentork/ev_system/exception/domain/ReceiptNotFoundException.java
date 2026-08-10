package com.bentork.ev_system.exception.domain;

public class ReceiptNotFoundException extends RuntimeException {

    public ReceiptNotFoundException(Long receiptId) {
        super("Receipt not found with ID: " + receiptId);
    }
}
