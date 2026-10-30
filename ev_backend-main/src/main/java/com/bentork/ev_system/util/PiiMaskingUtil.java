package com.bentork.ev_system.util;

/**
 * Centralized PII (Personally Identifiable Information) masking utility.
 * <p>
 * Ensures that personal data such as emails, phone numbers, names, and IP addresses
 * are never written to application logs in plain text, in compliance with
 * DPDPA Section 8 (reasonable security safeguards).
 * </p>
 *
 * <p><b>Usage:</b></p>
 * <pre>
 *   log.info("User logged in: {}", PiiMaskingUtil.maskEmail(email));
 *   log.info("Phone verified: {}", PiiMaskingUtil.maskMobile(mobile));
 * </pre>
 */
public final class PiiMaskingUtil {

    private PiiMaskingUtil() {
        // Utility class — prevent instantiation
    }

    /**
     * Masks an email address, showing only the first character of the local part
     * and the first character of the domain.
     * <p>Example: {@code "jayesh@gmail.com"} → {@code "j***@g***.com"}</p>
     *
     * @param email the email address to mask
     * @return the masked email, or {@code "***"} if null/blank
     */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "***";
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            // Not a valid email format — mask generically
            return maskGeneric(email);
        }

        String localPart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex + 1);

        String maskedLocal = localPart.charAt(0) + "***";

        // Mask the domain: show first char + "***" + TLD
        int dotIndex = domainPart.lastIndexOf('.');
        String maskedDomain;
        if (dotIndex > 0) {
            maskedDomain = domainPart.charAt(0) + "***" + domainPart.substring(dotIndex);
        } else {
            maskedDomain = domainPart.charAt(0) + "***";
        }

        return maskedLocal + "@" + maskedDomain;
    }

    /**
     * Masks a mobile/phone number, showing only the last 4 digits.
     * <p>Example: {@code "9876543210"} → {@code "****3210"}</p>
     *
     * @param mobile the phone number to mask
     * @return the masked phone number, or {@code "****"} if null/short
     */
    public static String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 4) {
            return "****";
        }
        return "****" + mobile.substring(mobile.length() - 4);
    }

    /**
     * Masks a person's name, showing only the first character.
     * <p>Example: {@code "Jayesh"} → {@code "J***"}</p>
     *
     * @param name the name to mask
     * @return the masked name, or {@code "***"} if null/blank
     */
    public static String maskName(String name) {
        if (name == null || name.isBlank()) {
            return "***";
        }
        return name.charAt(0) + "***";
    }

    /**
     * Masks an IP address, showing only the first octet (IPv4) or first group (IPv6).
     * <p>Example: {@code "192.168.1.100"} → {@code "192.*.*.*"}</p>
     * <p>Example: {@code "2001:0db8:..."} → {@code "2001:***"}</p>
     *
     * @param ipAddress the IP address to mask
     * @return the masked IP address, or {@code "***"} if null/blank
     */
    public static String maskIpAddress(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return "***";
        }

        // IPv4
        int dotIndex = ipAddress.indexOf('.');
        if (dotIndex > 0) {
            return ipAddress.substring(0, dotIndex) + ".*.*.*";
        }

        // IPv6
        int colonIndex = ipAddress.indexOf(':');
        if (colonIndex > 0) {
            return ipAddress.substring(0, colonIndex) + ":***";
        }

        return "***";
    }

    /**
     * Generic masking for any PII string — shows only the first character.
     * <p>Example: {@code "jayesh"} → {@code "j***"}</p>
     *
     * @param value the value to mask
     * @return the masked value, or {@code "***"} if null/blank
     */
    public static String maskGeneric(String value) {
        if (value == null || value.isBlank()) {
            return "***";
        }
        return value.charAt(0) + "***";
    }
}
