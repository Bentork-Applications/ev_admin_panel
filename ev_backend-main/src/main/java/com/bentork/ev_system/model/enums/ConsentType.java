package com.bentork.ev_system.model.enums;

/**
 * Types of consent that can be collected from users under DPDPA.
 * Each type maps to a specific data processing purpose.
 */
public enum ConsentType {

    /** Consent to the platform's Terms and Conditions */
    TERMS_AND_CONDITIONS,

    /** Consent to processing personal data (name, email, mobile, etc.) */
    DATA_PROCESSING,

    /** Consent to receive push notifications via FCM */
    PUSH_NOTIFICATIONS,

    /** Consent to receive marketing communications */
    MARKETING
}
