package com.bentork.ev_system.service.ocpp.handler;

import com.bentork.ev_system.enums.ChargerStatus;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.service.ocpp.OcppActionHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class BootNotificationHandler implements OcppActionHandler {

    private final ChargerRepository chargerRepository;
    private final ObjectMapper objectMapper;

    @Value("${ocpp.heartbeat.interval:60}")
    private int heartbeatInterval;

    @Override
    public String getAction() {
        return "BootNotification";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        log.info("BootNotification received from {}: {}", ocppId, payload);

        try {
            Charger charger = chargerRepository.findByOcppId(ocppId).orElse(null);
            if (charger != null) {
                charger.setStatus(ChargerStatus.AVAILABLE.getValue());
                charger.setAvailability(true);
                chargerRepository.save(charger);
                log.info("Charger {} status set to AVAILABLE", ocppId);
            }
        } catch (Exception e) {
            log.error("Error updating charger status on boot: {}", e.getMessage());
        }

        ObjectNode response = objectMapper.createObjectNode();
        response.put("status", "Accepted");
        response.put("currentTime", OffsetDateTime.now().toString());
        response.put("interval", heartbeatInterval);
        return response;
    }
}
