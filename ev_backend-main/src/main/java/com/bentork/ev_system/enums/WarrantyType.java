package com.bentork.ev_system.enums;

/**
 * Enum representing the type of battery warranty.
 *
 * FULL_WARRANTY    — covers complete battery replacement within the initial warranty period.
 * SERVICE_WARRANTY — covers repair/servicing for an extended period beyond the full warranty.
 */
public enum WarrantyType {

    FULL_WARRANTY("full_warranty"),
    SERVICE_WARRANTY("service_warranty");

    private final String value;

    WarrantyType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string to WarrantyType enum (case-insensitive).
     */
    public static WarrantyType fromString(String type) {
        if (type == null) {
            return null;
        }

        String normalized = type.toLowerCase().trim();

        switch (normalized) {
            case "full_warranty":
                return FULL_WARRANTY;
            case "service_warranty":
                return SERVICE_WARRANTY;
            default:
                return null;
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
