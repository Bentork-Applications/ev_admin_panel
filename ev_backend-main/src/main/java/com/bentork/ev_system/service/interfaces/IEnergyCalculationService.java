package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.Session;

/**
 * Interface for energy calculation operations.
 * Pure business logic with zero external dependencies.
 */
public interface IEnergyCalculationService {
    /**
     * Resolve the energy consumed during a session.
     * Prioritizes actual meter readings over calculated values.
     */
    double resolveEnergy(Session session);

    /**
     * Calculate energy from session duration and charger output.
     * Used as a fallback when meter readings are unavailable.
     */
    double calculateFromDuration(Session session);
}
