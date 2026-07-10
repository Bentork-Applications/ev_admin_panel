package com.bentork.ev_system.service;

import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.interfaces.IEnergyCalculationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Pure energy calculation service with zero external dependencies.
 * Extracted from SessionService to adhere to Single Responsibility Principle.
 */
@Slf4j
@Service
public class EnergyCalculationService implements IEnergyCalculationService {

    @Override
    public double resolveEnergy(Session session) {
        if (session.getEnergyKwh() > 0.001) {
            log.info("Using actual meter reading: sessionId={}, energyKwh={}",
                    session.getId(), session.getEnergyKwh());
            return session.getEnergyKwh();
        }
        log.info("No meter reading available, calculating from duration: sessionId={}", session.getId());
        return calculateFromDuration(session);
    }

    @Override
    public double calculateFromDuration(Session session) {
        Duration duration = Duration.between(session.getStartTime(), session.getEndTime());
        long minutes = duration.toMinutes();

        Double chargerSpeedKw = session.getCharger().getKwOutput();
        if (chargerSpeedKw == null || chargerSpeedKw <= 0) {
            log.warn("CRITICAL CONFIG WARNING: Charger {} (ID: {}) has NO kwOutput configured. " +
                    "Using 0 kWh for energy calculation. Please configure charger kwOutput.",
                    session.getCharger().getOcppId(), session.getCharger().getId());
            return 0.0;
        }

        double hours = minutes / 60.0;
        double energy = hours * chargerSpeedKw;
        return Math.round(energy * 1000.0) / 1000.0;
    }
}
