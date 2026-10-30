package com.bentork.ev_system.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNormalizationUtilTest {

    @Test
    void testNormalizeIndianTenDigits() {
        assertEquals("919876543210", PhoneNormalizationUtil.normalize("9876543210"));
    }

    @Test
    void testNormalizeWithLeadingZero() {
        assertEquals("919876543210", PhoneNormalizationUtil.normalize("09876543210"));
    }

    @Test
    void testNormalizeWithPlusAndSpaces() {
        assertEquals("919876543210", PhoneNormalizationUtil.normalize("+91 98765 43210"));
    }

    @Test
    void testNormalizeWithHyphens() {
        assertEquals("919876543210", PhoneNormalizationUtil.normalize("+91-98765-43210"));
    }

    @Test
    void testNormalizeAlreadyStandardE164() {
        assertEquals("919876543210", PhoneNormalizationUtil.normalize("919876543210"));
    }

    @Test
    void testNormalizeNullOrEmpty() {
        assertNull(PhoneNormalizationUtil.normalize(null));
        assertNull(PhoneNormalizationUtil.normalize(""));
        assertNull(PhoneNormalizationUtil.normalize("   "));
        assertNull(PhoneNormalizationUtil.normalize("---"));
    }

    @Test
    void testIsValid() {
        assertTrue(PhoneNormalizationUtil.isValid("9876543210"));
        assertTrue(PhoneNormalizationUtil.isValid("+919876543210"));
        assertTrue(PhoneNormalizationUtil.isValid("09876543210"));

        assertFalse(PhoneNormalizationUtil.isValid(null));
        assertFalse(PhoneNormalizationUtil.isValid(""));
        assertFalse(PhoneNormalizationUtil.isValid("12345")); // too short
        assertFalse(PhoneNormalizationUtil.isValid("abcdefg"));
    }

    @Test
    void testFormatDisplay() {
        assertEquals("+91 98765 43210", PhoneNormalizationUtil.formatDisplay("9876543210"));
        assertEquals("+91 98765 43210", PhoneNormalizationUtil.formatDisplay("+919876543210"));
    }
}
