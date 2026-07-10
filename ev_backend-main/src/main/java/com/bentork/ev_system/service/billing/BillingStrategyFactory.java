package com.bentork.ev_system.service.billing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import com.bentork.ev_system.model.Receipt;

import java.util.List;

/**
 * Factory that auto-discovers all BillingStrategy beans and selects
 * the appropriate strategy for a given receipt.
 * Adding a new billing type = new @Component class, zero changes here.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BillingStrategyFactory {

    private final List<BillingStrategy> strategies;

    public BillingStrategy getStrategy(Receipt receipt) {
        return strategies.stream()
                .filter(s -> s.supports(receipt))
                .findFirst()
                .orElse(null); // null means no receipt or no matching strategy
    }
}
