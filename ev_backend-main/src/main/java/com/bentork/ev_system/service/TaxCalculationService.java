package com.bentork.ev_system.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TaxCalculationService {

    @Value("${tax.gst.rate}")
    private BigDecimal gstRate;

    public BigDecimal calculateGst(BigDecimal amount) {
        return amount.multiply(gstRate)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates PST as a percentage of the base rate, with min-1-unit rule.
     * Formula: (pstPercent / 100) × baseRate × max(1, floor(energyUsed))
     *
     * The min-1-unit rule ensures users always pay at least 1 unit of PST,
     * even for sub-1-kWh usage.
     *
     * Examples (baseRate = ₹16, pstPercent = 12.5%):
     *   pstPerUnit = 12.5% × 16 = ₹2
     *   0.20 kWh → max(1, 0) = 1 unit → ₹2
     *   1.50 kWh → max(1, 1) = 1 unit → ₹2
     *   2.01 kWh → max(1, 2) = 2 units → ₹4
     *   3.00 kWh → max(1, 3) = 3 units → ₹6
     */
    public BigDecimal calculatePst(double energyUsed, Double baseRate, Double pstPercent) {
        if (pstPercent == null || pstPercent <= 0 || baseRate == null || baseRate <= 0) {
            return BigDecimal.ZERO;
        }
        int units = Math.max(1, (int) Math.floor(energyUsed));
        BigDecimal pstPerUnit = BigDecimal.valueOf(baseRate)
                .multiply(BigDecimal.valueOf(pstPercent))
                .divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(units)
                .multiply(pstPerUnit)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates platform fee based on per-kWh fixed rate set on each charger.
     * Formula: max(1, floor(energyUsed)) × platformFeePerKwh
     *
     * Examples (platformFeePerKwh = ₹5):
     *   0.01 kWh → max(1, 0) = 1 → ₹5
     *   0.98 kWh → max(1, 0) = 1 → ₹5
     *   2.01 kWh → max(1, 2) = 2 → ₹10
     *   3.01 kWh → max(1, 3) = 3 → ₹15
     */
    public BigDecimal calculatePlatformFee(double energyUsed, Double platformFeePerKwh) {
        if (platformFeePerKwh == null || platformFeePerKwh <= 0) {
            return BigDecimal.ZERO;
        }
        int units = Math.max(1, (int) Math.floor(energyUsed));
        return BigDecimal.valueOf(units)
                .multiply(BigDecimal.valueOf(platformFeePerKwh))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
