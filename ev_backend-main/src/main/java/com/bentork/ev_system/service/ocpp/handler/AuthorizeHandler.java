package com.bentork.ev_system.service.ocpp.handler;

import com.bentork.ev_system.service.interfaces.IRFIDChargingService;
import com.bentork.ev_system.service.ocpp.OcppActionHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthorizeHandler implements OcppActionHandler {

    private final IRFIDChargingService rfidChargingService;
    private final ObjectMapper objectMapper;

    @Override
    public String getAction() {
        return "Authorize";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        String idTag = payload.has("idTag") ? payload.get("idTag").asText() : null;
        log.info("Authorize request for idTag: {}", idTag);

        // App-initiated session: idTag = "SESSION_<id>" — already paid via app
        if (idTag != null && idTag.startsWith("SESSION_")) {
            log.info("Auto-accepting app session idTag: {}", idTag);

            ObjectNode idTagInfo = objectMapper.createObjectNode();
            idTagInfo.put("status", "Accepted");

            ObjectNode response = objectMapper.createObjectNode();
            response.set("idTagInfo", idTagInfo);
            return response;
        }

        // RFID card flow: validate card exists and is active
        boolean isValid = false;
        try {
            isValid = rfidChargingService.validateRFIDCard(idTag);
        } catch (Exception e) {
            log.warn("RFID validation failed: {}", e.getMessage());
        }

        ObjectNode idTagInfo = objectMapper.createObjectNode();
        idTagInfo.put("status", isValid ? "Accepted" : "Invalid");

        ObjectNode response = objectMapper.createObjectNode();
        response.set("idTagInfo", idTagInfo);
        return response;
    }
}
