package com.bentork.ev_system.service.ocpp.handler;

import com.bentork.ev_system.service.ocpp.OcppActionHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class HeartbeatHandler implements OcppActionHandler {

    private final ObjectMapper objectMapper;

    @Override
    public String getAction() {
        return "Heartbeat";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        log.debug("Heartbeat received from {}", ocppId);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("currentTime", OffsetDateTime.now().toString());
        return response;
    }
}
