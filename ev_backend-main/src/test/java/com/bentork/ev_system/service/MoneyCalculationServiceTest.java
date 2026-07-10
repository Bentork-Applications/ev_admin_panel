package com.bentork.ev_system.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MoneyCalculationServiceTest {

    private MoneyCalculationService service;

    @BeforeEach
    void setUp() {
        service = new MoneyCalculationService();
    }

    @Test
    void testExactAmountNoRefund() {
        // ₹18 in, rate=16, pst=12.5% → 1 kWh, ₹18 charged, ₹0 refund
        BigDecimal amountEntered = new BigDecimal("18.00");
        BigDecimal baseRate = new BigDecimal("16.00");
        BigDecimal pstPercent = new BigDecimal("12.5");

        MoneyCalculationService.MoneyCalculationResult result = service.calculate(amountEntered, baseRate, pstPercent, BigDecimal.ZERO);

        assertEquals(new BigDecimal("18.00"), result.getEffectiveRate());
        assertEquals(new BigDecimal("1"), result.getAllocatedKwh());
        assertEquals(new BigDecimal("18.00"), result.getChargeableAmount());
        assertEquals(new BigDecimal("0.00"), result.getRefundAmount());
    }

    @Test
    void testPartialRefund() {
        // ₹40 in, rate=16, pst=12.5% → 2 kWh, ₹36 charged, ₹4 refund
        BigDecimal amountEntered = new BigDecimal("40.00");
        BigDecimal baseRate = new BigDecimal("16.00");
        BigDecimal pstPercent = new BigDecimal("12.5");

        MoneyCalculationService.MoneyCalculationResult result = service.calculate(amountEntered, baseRate, pstPercent, BigDecimal.ZERO);

        assertEquals(new BigDecimal("18.00"), result.getEffectiveRate());
        assertEquals(new BigDecimal("2"), result.getAllocatedKwh());
        assertEquals(new BigDecimal("36.00"), result.getChargeableAmount());
        assertEquals(new BigDecimal("4.00"), result.getRefundAmount());
    }

    @Test
    void testInsufficientAmountThrowsException() {
        // ₹17 in, rate=16, pst=12.5% → exception (insufficient for 1 kWh)
        BigDecimal amountEntered = new BigDecimal("17.00");
        BigDecimal baseRate = new BigDecimal("16.00");
        BigDecimal pstPercent = new BigDecimal("12.5");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> 
            service.calculate(amountEntered, baseRate, pstPercent, BigDecimal.ZERO)
        );
        assertTrue(ex.getMessage().contains("Minimum required for 1 kWh"));
    }

    @Test
    void testZeroOrNegativeAmountThrowsException() {
        BigDecimal baseRate = new BigDecimal("16.00");
        BigDecimal pstPercent = new BigDecimal("12.5");

        assertThrows(IllegalArgumentException.class, () -> 
            service.calculate(BigDecimal.ZERO, baseRate, pstPercent, BigDecimal.ZERO)
        );

        assertThrows(IllegalArgumentException.class, () -> 
            service.calculate(new BigDecimal("-10"), baseRate, pstPercent, BigDecimal.ZERO)
        );
    }

    @Test
    void testLargerAmount() {
        // ₹100 in, rate=16, pst=12.5% → 5 kWh, ₹90 charged, ₹10 refund
        BigDecimal amountEntered = new BigDecimal("100.00");
        BigDecimal baseRate = new BigDecimal("16.00");
        BigDecimal pstPercent = new BigDecimal("12.5");

        MoneyCalculationService.MoneyCalculationResult result = service.calculate(amountEntered, baseRate, pstPercent, BigDecimal.ZERO);

        assertEquals(new BigDecimal("18.00"), result.getEffectiveRate());
        assertEquals(new BigDecimal("5"), result.getAllocatedKwh());
        assertEquals(new BigDecimal("90.00"), result.getChargeableAmount());
        assertEquals(new BigDecimal("10.00"), result.getRefundAmount());
    }
}
