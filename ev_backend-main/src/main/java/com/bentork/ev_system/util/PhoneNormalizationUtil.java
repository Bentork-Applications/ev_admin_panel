package com.bentork.ev_system.util;

import java.util.regex.Pattern;

/**
 * Utility for validating and normalizing phone numbers for WhatsApp campaigns.
 * Adheres to BRD Section 10.1 (Data Requirements - Import Validation).
 */
public class PhoneNormalizationUtil {

    private static final Pattern DIGITS_ONLY = Pattern.compile("[^0-9]");
    private static final Pattern VALID_E164 = Pattern.compile("^[1-9][0-9]{7,14}$");

    private PhoneNormalizationUtil() {
        // Private constructor for utility class
    }

    /**
     * Normalizes a phone number to standard E.164 digits format (without '+').
     * Handles common Indian mobile formats:
     * - 9876543210 -> 919876543210
     * - 09876543210 -> 919876543210
     * - +91 98765-43210 -> 919876543210
     * - 919876543210 -> 919876543210
     *
     * @param phone raw input phone string
     * @return normalized numeric string or null if blank
     */
    public static String normalize(String phone) {
        if (phone == null) {
            return null;
        }

        String cleaned = DIGITS_ONLY.matcher(phone.trim()).replaceAll("");
        if (cleaned.isEmpty()) {
            return null;
        }

        // Standard 10-digit Indian mobile number
        if (cleaned.length() == 10) {
            return "91" + cleaned;
        }

        // 11 digits starting with '0' (e.g. 09876543210)
        if (cleaned.length() == 11 && cleaned.startsWith("0")) {
            return "91" + cleaned.substring(1);
        }

        // International numbers already having country code or full length
        return cleaned;
    }

    /**
     * Validates whether a phone number can be normalized and meets minimum international length.
     *
     * @param phone raw input phone string
     * @return true if valid
     */
    public static boolean isValid(String phone) {
        String normalized = normalize(phone);
        if (normalized == null) {
            return false;
        }
        return VALID_E164.matcher(normalized).matches();
    }

    /**
     * Formats normalized number for UI display (e.g., +91 98765 43210).
     */
    public static String formatDisplay(String phone) {
        String normalized = normalize(phone);
        if (normalized == null) {
            return "";
        }
        if (normalized.startsWith("91") && normalized.length() == 12) {
            return "+91 " + normalized.substring(2, 7) + " " + normalized.substring(7);
        }
        return "+" + normalized;
    }
}
