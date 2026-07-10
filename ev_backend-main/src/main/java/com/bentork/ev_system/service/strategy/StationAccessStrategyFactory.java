package com.bentork.ev_system.service.strategy;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Factory for selecting the appropriate StationAccessStrategy based on user
 * role.
 * Follows Open/Closed Principle (OCP) - add new strategies without modifying
 * existing code.
 * Follows Dependency Inversion Principle (DIP) - depends on abstractions, not
 * concretions.
 */
@Component
@Slf4j
public class StationAccessStrategyFactory {

    private final List<StationAccessStrategy> strategies;
    private final Map<String, StationAccessStrategy> strategyMap = new HashMap<>();

    public StationAccessStrategyFactory(List<StationAccessStrategy> strategies) {
        this.strategies = strategies;
    }

    @PostConstruct
    public void init() {
        for (StationAccessStrategy strategy : strategies) {
            strategyMap.put(strategy.getSupportedRole(), strategy);
            log.info("Registered station access strategy for role: {}", strategy.getSupportedRole());
        }
    }

    /**
     * Get the appropriate strategy for the given role
     * 
     * @param role User role (ADMIN, DEALER, etc.)
     * @return StationAccessStrategy for the given role
     * @throws IllegalArgumentException if no strategy found for the role
     */
    public StationAccessStrategy getStrategy(String role) {
        StationAccessStrategy strategy = strategyMap.get(role);
        if (strategy == null) {
            log.error("No station access strategy found for role: {}", role);
            throw new IllegalArgumentException("Unknown role: " + role);
        }
        log.debug("Selected {} strategy for role: {}", strategy.getClass().getSimpleName(), role);
        return strategy;
    }

    /**
     * Check if a strategy exists for the given role
     * 
     * @param role User role
     * @return true if strategy exists
     */
    public boolean hasStrategy(String role) {
        return strategyMap.containsKey(role);
    }
}
