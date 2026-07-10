package com.bentork.ev_system.service.billing;

import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;

/**
 * Strategy interface for billing calculations.
 * Each billing type (kWh package, time-based plan, subscription, etc.)
 * implements this interface. Adding a new billing type requires only
 * creating a new implementation — no existing code changes needed (Open/Closed Principle).
 */
public interface BillingStrategy {
    /**
     * Determines whether this strategy can handle the given receipt.
     */
    boolean supports(Receipt receipt);

    /**
     * Calculates the billing result for a completed session.
     */
    BillingResult calculate(Session session, Receipt receipt, double energyUsed);
}
