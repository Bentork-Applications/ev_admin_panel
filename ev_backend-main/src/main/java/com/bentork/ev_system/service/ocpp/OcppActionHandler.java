package com.bentork.ev_system.service.ocpp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Interface for OCPP action handlers.
 * Each implementation handles exactly one OCPP action (e.g., BootNotification, Heartbeat).
 * New OCPP actions = new handler file, zero changes to existing code (Open/Closed Principle).
 */
public interface OcppActionHandler {
    /**
     * @return The OCPP action name this handler processes (e.g., "BootNotification")
     */
    String getAction();

    /**
     * Handle an incoming OCPP action.
     * @param ocppId The charger's OCPP identifier
     * @param payload The JSON payload from the charger
     * @return The response payload to send back
     */
    ObjectNode handle(String ocppId, JsonNode payload);
}
