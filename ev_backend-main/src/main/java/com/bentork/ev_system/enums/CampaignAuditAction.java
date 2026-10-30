package com.bentork.ev_system.enums;

/**
 * Enum representing auditable actions in the WhatsApp campaign system.
 * Used by CampaignAuditLog to track who did what and when (FR-26).
 */
public enum CampaignAuditAction {

    // Campaign lifecycle
    CAMPAIGN_CREATED("CAMPAIGN_CREATED"),
    CAMPAIGN_UPDATED("CAMPAIGN_UPDATED"),
    CAMPAIGN_ACTIVATED("CAMPAIGN_ACTIVATED"),
    CAMPAIGN_PAUSED("CAMPAIGN_PAUSED"),
    CAMPAIGN_RESUMED("CAMPAIGN_RESUMED"),
    CAMPAIGN_COMPLETED("CAMPAIGN_COMPLETED"),
    CAMPAIGN_CANCELLED("CAMPAIGN_CANCELLED"),

    // Round management
    ROUND_CREATED("ROUND_CREATED"),
    ROUND_UPDATED("ROUND_UPDATED"),
    ROUND_SCHEDULED("ROUND_SCHEDULED"),
    ROUND_TRIGGERED("ROUND_TRIGGERED"),
    ROUND_COMPLETED("ROUND_COMPLETED"),
    ROUND_CANCELLED("ROUND_CANCELLED"),
    ROUND_PAUSED("ROUND_PAUSED"),
    ROUND_RESUMED("ROUND_RESUMED"),

    // Lead / membership management
    LEAD_ADDED("LEAD_ADDED"),
    LEAD_REMOVED("LEAD_REMOVED"),
    LEAD_PAUSED("LEAD_PAUSED"),
    LEAD_RESUMED("LEAD_RESUMED"),
    LEAD_OPTED_OUT("LEAD_OPTED_OUT"),
    LEAD_SUPPRESSED("LEAD_SUPPRESSED"),
    LEADS_IMPORTED("LEADS_IMPORTED"),

    // Messaging
    MESSAGE_SENT("MESSAGE_SENT"),
    MESSAGE_FAILED("MESSAGE_FAILED"),
    MESSAGE_RETRIED("MESSAGE_RETRIED"),
    MESSAGE_DELIVERED("MESSAGE_DELIVERED"),
    MESSAGE_READ("MESSAGE_READ"),

    // Reply and inbound
    REPLY_RECEIVED("REPLY_RECEIVED"),

    // Template management
    TEMPLATE_CREATED("TEMPLATE_CREATED"),
    TEMPLATE_UPDATED("TEMPLATE_UPDATED"),
    TEMPLATE_DEACTIVATED("TEMPLATE_DEACTIVATED"),

    // Assignment
    ASSIGNMENT_CHANGED("ASSIGNMENT_CHANGED"),

    // Settings
    SETTINGS_CHANGED("SETTINGS_CHANGED");

    private final String value;

    CampaignAuditAction(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CampaignAuditAction fromString(String action) {
        if (action == null) {
            return null;
        }
        String normalized = action.toUpperCase().trim();
        for (CampaignAuditAction a : values()) {
            if (a.value.equals(normalized)) {
                return a;
            }
        }
        return null;
    }

    @Override
    public String toString() {
        return value;
    }
}
