package com.bentork.ev_system.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure arithmetic service for MONEY_BASED sessions.
 * Converts a rupee amount entered by the user into the maximum number of whole kWh units
 * that amount can buy, at the current tax-inclusive effective rate.
 */
@Service
public class MoneyCalculationService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    public static class MoneyCalculationResult {
        private final BigDecimal amountEntered;
        private final BigDecimal effectiveRate;
        private final BigDecimal allocatedKwh;
        private final BigDecimal chargeableAmount;
        private final BigDecimal refundAmount;

        public MoneyCalculationResult(BigDecimal amountEntered, BigDecimal effectiveRate,
                                      BigDecimal allocatedKwh, BigDecimal chargeableAmount, BigDecimal refundAmount) {
            this.amountEntered = amountEntered;
            this.effectiveRate = effectiveRate;
            this.allocatedKwh = allocatedKwh;
            this.chargeableAmount = chargeableAmount;
            this.refundAmount = refundAmount;
        }

        public BigDecimal getAmountEntered() { return amountEntered; }
        public BigDecimal getEffectiveRate() { return effectiveRate; }
        public BigDecimal getAllocatedKwh() { return allocatedKwh; }
        public BigDecimal getChargeableAmount() { return chargeableAmount; }
        public BigDecimal getRefundAmount() { return refundAmount; }
    }

    /**
     * @param amountEntered     User's rupee input
     * @param baseRate          Charger's base rate per kWh (₹)
     * @param pstPercent        PST percentage (e.g., 12.5 for 12.5%)
     * @param platformFeePerKwh Platform fee per kWh (₹, flat)
     * @return MoneyCalculationResult containing the exact allocations
     */
    public MoneyCalculationResult calculate(BigDecimal amountEntered, BigDecimal baseRate,
                                            BigDecimal pstPercent, BigDecimal platformFeePerKwh) {
        if (amountEntered == null || amountEntered.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount entered must be greater than zero");
        }

        // effectiveRate = baseRate * (1 + pstPercent / 100) + platformFeePerKwh
        BigDecimal onePlusPst = BigDecimal.ONE.add(pstPercent.divide(HUNDRED, 10, RoundingMode.HALF_UP));
        BigDecimal rateWithPst = baseRate.multiply(onePlusPst);
        BigDecimal effectiveRate = rateWithPst.add(platformFeePerKwh).setScale(2, RoundingMode.HALF_UP);

        if (effectiveRate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Effective rate must be positive");
        }

        // allocatedKwh = floor(amountEntered / effectiveRate)
        BigDecimal allocatedKwh = amountEntered.divideToIntegralValue(effectiveRate);

        if (allocatedKwh.compareTo(BigDecimal.ONE) < 0) {
            throw new IllegalArgumentException("Amount entered is too low. Minimum required for 1 kWh is ₹" + effectiveRate);
        }

        // chargeableAmount = allocatedKwh * effectiveRate
        BigDecimal chargeableAmount = allocatedKwh.multiply(effectiveRate).setScale(2, RoundingMode.HALF_UP);

        // refundAmount = amountEntered - chargeableAmount
        BigDecimal refundAmount = amountEntered.subtract(chargeableAmount).setScale(2, RoundingMode.HALF_UP);

        return new MoneyCalculationResult(amountEntered, effectiveRate, allocatedKwh, chargeableAmount, refundAmount);
    }
}
