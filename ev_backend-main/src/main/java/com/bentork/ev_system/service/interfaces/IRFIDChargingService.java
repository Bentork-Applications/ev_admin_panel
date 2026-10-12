package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.Session;

import java.math.BigDecimal;

/**
 * Interface for RFID card-based charging operations.
 */
public interface IRFIDChargingService {
    Session startCharging(String cardNumber, Long chargerId, String boxId);
    Session updateEnergy(Long sessionId, BigDecimal currentKwh);
    Session stopCharging(Long sessionId);
    boolean validateRFIDCard(String cardNumber);
}
