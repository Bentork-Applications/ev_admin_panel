package com.bentork.ev_system.exception.domain;

public class ChargerOfflineException extends RuntimeException {

    public ChargerOfflineException(Long chargerId) {
        super("Charger " + chargerId + " is offline. Session failed and amount refunded.");
    }
}
