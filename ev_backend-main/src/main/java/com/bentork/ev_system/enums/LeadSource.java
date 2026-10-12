package com.bentork.ev_system.enums;

/**
 * Enum representing the source channel where a lead was captured.
 *
 * All values are stored in LOWERCASE for consistency.
 */
public enum LeadSource {

    INDIAMART("indiamart"),
    PHONE_CALL("phone_call"),
    WEBSITE("website"),
    REFERRAL("referral"),
    EXHIBITION("exhibition"),
    WALK_IN("walk_in"),
    SOCIAL_MEDIA("social_media");

    private final String value;

    LeadSource(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    /**
     * Convert a string to LeadSource enum (case-insensitive).
     */
    public static LeadSource fromString(String source) {
        if (source == null) {
            return null;
        }

        String normalized = source.toLowerCase().trim();

        switch (normalized) {
            case "indiamart":
                return INDIAMART;
            case "phone_call":
                return PHONE_CALL;
            case "website":
                return WEBSITE;
            case "referral":
                return REFERRAL;
            case "exhibition":
                return EXHIBITION;
            case "walk_in":
                return WALK_IN;
            case "social_media":
                return SOCIAL_MEDIA;
            default:
                return null;
        }
    }

    /**
     * Check if source string matches this enum value (case-insensitive).
     */
    public boolean matches(String source) {
        if (source == null) {
            return false;
        }
        return this.value.equalsIgnoreCase(source.trim());
    }

    @Override
    public String toString() {
        return value;
    }
}
