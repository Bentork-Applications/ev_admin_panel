package com.bentork.ev_system.enums;

public enum StockTransactionType {
    IN("In"),
    OUT("Out"),
    ADJUSTMENT("Adjustment");

    private final String value;

    StockTransactionType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
