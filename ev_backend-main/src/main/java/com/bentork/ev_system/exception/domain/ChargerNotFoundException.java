package com.bentork.ev_system.exception.domain;

public class ChargerNotFoundException extends RuntimeException {

    public ChargerNotFoundException(Long chargerId) {
        super("Charger not found with ID: " + chargerId);
    }

    public ChargerNotFoundException(String ocppId) {
        super("Charger not found for OCPP ID: " + ocppId);
    }
}
