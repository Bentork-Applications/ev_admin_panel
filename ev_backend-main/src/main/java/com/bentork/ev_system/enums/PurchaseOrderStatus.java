package com.bentork.ev_system.enums;

public enum PurchaseOrderStatus {
    DRAFT("Draft"),
    APPROVED("Approved"),
    PARTIALLY_FULFILLED("Partially Fulfilled"),
    FULFILLED("Fulfilled"),
    CANCELLED("Cancelled");

    private final String value;

    PurchaseOrderStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
