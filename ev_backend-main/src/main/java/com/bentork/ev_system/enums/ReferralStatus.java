package com.bentork.ev_system.enums;

public enum ReferralStatus {
    PENDING("pending"),
    COMPLETED("completed");

    private final String value;

    ReferralStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public boolean matches(String status) {
        return this.value.equalsIgnoreCase(status);
    }
}
