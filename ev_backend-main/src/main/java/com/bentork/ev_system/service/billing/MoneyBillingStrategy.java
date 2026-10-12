package com.bentork.ev_system.service.billing;

import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.TaxCalculationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Billing strategy for MONEY_BASED sessions.
 * User enters a rupee amount, gets converted to whole kWh.
 * PST and platform fee are calculated on actual delivered energy.
 */
@Slf4j
@Component
@Order(1) // Try first
public class MoneyBillingStrategy implements BillingStrategy {

    private final TaxCalculationService taxService;

    public MoneyBillingStrategy(TaxCalculationService taxService) {
        this.taxService = taxService;
    }

    @Override
    public boolean supports(Receipt receipt) {
        return receipt != null && "MONEY_BASED".equals(receipt.getSessionType());
    }

    @Override
    public BillingResult calculate(Session session, Receipt receipt, double energyUsed) {
        BigDecimal rate = BigDecimal.valueOf(session.getCharger().getRate());
        BigDecimal allocatedKwh = session.getAllocatedKwh();
        BigDecimal chargeableAmount = session.getChargeableAmount(); // total prepaid (chargeable portion)

        // Calculate actual cost breakdown based on delivered energy
        BigDecimal deliveredKwh = BigDecimal.valueOf(energyUsed);
        BigDecimal actualEnergyCost = deliveredKwh.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal actualPst = taxService.calculatePst(
                energyUsed, session.getCharger().getRate(), session.getCharger().getPstPercent());
        BigDecimal actualPlatformFee = taxService.calculatePlatformFee(
                energyUsed, session.getCharger().getPlatformFeePerKwh());

        BigDecimal actualCost = actualEnergyCost.add(actualPst).add(actualPlatformFee);
        BigDecimal prepaid = chargeableAmount;

        log.info("MONEY_BASED billing: sessionId={}, energyUsed={}, allocatedKwh={}, " +
                "prepaid={}, actualCost={}, pst={}, platformFee={}",
                session.getId(), energyUsed, allocatedKwh, prepaid, actualCost, actualPst, actualPlatformFee);

        BillingResult result = new BillingResult();
        result.setPrepaidAmount(prepaid);
        result.setPstAmount(actualPst);
        result.setPlatformFee(actualPlatformFee);

        if (actualCost.compareTo(prepaid) < 0) {
            BigDecimal refund = prepaid.subtract(actualCost);
            result.setFinalCost(actualCost);
            result.setRefundAmount(refund);
            result.setRefundIssued(true);
            result.setDescription("Early stop refund: ₹" + refund + " (delivered " +
                String.format("%.2f", energyUsed) + " of " + allocatedKwh + " kWh, " +
                "PST: ₹" + actualPst + ", Platform fee: ₹" + actualPlatformFee + ")");
        } else {
            // Delivered >= allocated, cap at prepaid amount
            result.setFinalCost(prepaid);
        }

        return result;
    }
}
