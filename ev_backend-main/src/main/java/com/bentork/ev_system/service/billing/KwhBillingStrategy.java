package com.bentork.ev_system.service.billing;

import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.TaxCalculationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Billing strategy for kWh-based (power package) sessions.
 * User selects a specific amount of kWh to purchase upfront.
 */
@Slf4j
@Component
public class KwhBillingStrategy implements BillingStrategy {

    private final TaxCalculationService taxService;

    public KwhBillingStrategy(TaxCalculationService taxService) {
        this.taxService = taxService;
    }

    @Override
    public boolean supports(Receipt receipt) {
        return receipt != null && "CUSTOM".equals(receipt.getSessionType()) && receipt.getSelectedKwh() != null;
    }

    @Override
    public BillingResult calculate(Session session, Receipt receipt, double energyUsed) {
        BigDecimal rate = BigDecimal.valueOf(session.getCharger().getRate());
        double selectedKwh = receipt.getSelectedKwh().doubleValue();

        // Platform fee locked on selectedKwh (floored-unit logic) — does NOT change with actual usage
        BigDecimal platformFee = taxService.calculatePlatformFee(
                selectedKwh, session.getCharger().getPlatformFeePerKwh());

        // Energy cost based on ACTUAL usage
        BigDecimal energyCost = BigDecimal.valueOf(energyUsed).multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);
        
        BigDecimal pst = taxService.calculatePst(energyUsed, session.getCharger().getRate(), session.getCharger().getPstPercent());
        BigDecimal finalCost = energyCost.add(platformFee).add(pst);

        // Prepaid also included the same platform fee and its PST
        BigDecimal prepaidEnergyCost = BigDecimal.valueOf(selectedKwh).multiply(rate)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal prepaidPst = taxService.calculatePst(selectedKwh, session.getCharger().getRate(), session.getCharger().getPstPercent());
        BigDecimal prepaid = prepaidEnergyCost.add(platformFee).add(prepaidPst);

        log.info("kWh billing: sessionId={}, selectedKwh={}, actualKwh={}, prepaid={}, finalCost={}, platformFee={}, pst={}",
                session.getId(), selectedKwh, energyUsed, prepaid, finalCost, platformFee, pst);

        BillingResult result = new BillingResult();
        result.setFinalCost(finalCost);
        result.setPrepaidAmount(prepaid);
        result.setPlatformFee(platformFee);
        result.setPstAmount(pst);

        if (finalCost.compareTo(prepaid) < 0) {
            BigDecimal refund = prepaid.subtract(finalCost);
            result.setRefundAmount(refund);
            result.setRefundIssued(true);
            result.setDescription("Unused energy refund: ₹" + refund + " (Used " +
                    String.format("%.2f", energyUsed) + " kWh of " + String.format("%.2f", selectedKwh) + " kWh selected, Platform fee: ₹" + platformFee + ", PST: ₹" + pst + ")");
        } else if (finalCost.compareTo(prepaid) > 0) {
            BigDecimal extra = finalCost.subtract(prepaid);
            result.setExtraDebit(extra);
            result.setExtraDebited(true);
            result.setDescription("Extra amount ₹" + extra + " deducted. (Used " +
                    String.format("%.2f", energyUsed) + " kWh, exceeded " + String.format("%.2f", selectedKwh) + " kWh selected, Platform fee: ₹" + platformFee + ", PST: ₹" + pst + ")");
        }
        return result;
    }
}
