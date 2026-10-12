package com.bentork.ev_system.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcppServerService {

    private final OcppWebSocketServer ocppWebSocketServer;

    @PostConstruct
    public void init() {
        try {
            ocppWebSocketServer.start();
            log.info("🚀 OCPP 1.6 WebSocket Server initialized and listening on port {}", ocppWebSocketServer.getPort());
        } catch (Exception e) {
            log.error("Failed to start OCPP WebSocket Server", e);
        }
    }
}
