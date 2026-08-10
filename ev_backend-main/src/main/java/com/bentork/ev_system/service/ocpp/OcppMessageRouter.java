package com.bentork.ev_system.service.ocpp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Routes incoming OCPP action messages to the appropriate handler.
 * Auto-discovers all OcppActionHandler beans registered in the Spring context.
 */
@Service
public class OcppMessageRouter {

    private static final Logger log = LoggerFactory.getLogger(OcppMessageRouter.class);

    private final Map<String, OcppActionHandler> handlers;

    public OcppMessageRouter(List<OcppActionHandler> handlerList) {
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(OcppActionHandler::getAction, h -> h));
        log.info("OCPP Message Router initialized with {} handlers: {}",
                handlers.size(), handlers.keySet());
    }

    /**
     * Route an OCPP action to the appropriate handler.
     * @return response payload, or null if the action is unsupported
     */
    public ObjectNode route(String ocppId, String action, JsonNode payload) {
        OcppActionHandler handler = handlers.get(action);
        if (handler == null) {
            log.warn("Unsupported OCPP action: {}", action);
            return null;
        }
        return handler.handle(ocppId, payload);
    }

    public boolean isSupported(String action) {
        return handlers.containsKey(action);
    }
}
