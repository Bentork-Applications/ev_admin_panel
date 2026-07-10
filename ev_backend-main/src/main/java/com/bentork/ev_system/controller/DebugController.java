package com.bentork.ev_system.controller;

import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.OcppWebSocketServer;
import com.bentork.ev_system.service.ocpp.OcppConnectionManager;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.java_websocket.WebSocket;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/debug")
public class DebugController {
    private final OcppWebSocketServer ocppWebSocketServer;
    private final OcppConnectionManager connectionManager;
    private final SessionRepository sessionRepository;
    private final ChargerRepository chargerRepository;

    /**
     * ✅ CHECK SYSTEM STATUS - Simple version
     */
    @GetMapping("/status")
    public ResponseEntity<?> getSystemStatus() {
        Map<String, Object> status = new HashMap<>();

        try {
            // 1. OCPP Server Status
            Map<String, WebSocket> connected = ocppWebSocketServer.getConnectedChargers();

            status.put("ocppServer", Map.of(
                    "running", true,
                    "port", 8887,
                    "connectedChargers", connected.size(),
                    "chargerIds", new ArrayList<>(connected.keySet())));

            // 2. Database Chargers
            List<Charger> dbChargers = chargerRepository.findAll();

            List<Map<String, Object>> chargerList = new ArrayList<>();
            for (Charger c : dbChargers) {
                Map<String, Object> chargerInfo = new HashMap<>();
                chargerInfo.put("id", c.getId());
                chargerInfo.put("ocppId", c.getOcppId());
                chargerInfo.put("available", c.isAvailability());
                chargerInfo.put("occupied", c.isOccupied());
                chargerInfo.put("wsConnected", connected.containsKey(c.getOcppId()));
                chargerInfo.put("wsStatus",
                        connected.containsKey(c.getOcppId())
                                ? (connected.get(c.getOcppId()).isOpen() ? "OPEN" : "CLOSED")
                                : "NOT_CONNECTED");
                chargerList.add(chargerInfo);
            }
            status.put("chargers", chargerList);

            // 3. Active/Initiated Sessions
            List<Session> activeSessions = sessionRepository.findAll().stream()
                    .filter(s -> "active".equalsIgnoreCase(s.getStatus()) ||
                            "INITIATED".equalsIgnoreCase(s.getStatus()))
                    .collect(Collectors.toList());

            List<Map<String, Object>> sessionList = new ArrayList<>();
            for (Session s : activeSessions) {
                Map<String, Object> sessionInfo = new HashMap<>();
                sessionInfo.put("sessionId", s.getId());
                sessionInfo.put("status", s.getStatus());
                sessionInfo.put("chargerId", s.getCharger().getId());
                sessionInfo.put("ocppId", s.getCharger().getOcppId());
                sessionInfo.put("userId", s.getUser().getId());
                sessionInfo.put("startTime", s.getStartTime() != null ? s.getStartTime().toString() : "NULL");
                sessionInfo.put("createdAt", s.getCreatedAt().toString());
                sessionList.add(sessionInfo);
            }
            status.put("activeSessions", sessionList);

            // 4. Summary
            status.put("summary", Map.of(
                    "totalChargersInDB", dbChargers.size(),
                    "chargersOnline", connected.size(),
                    "activeOrInitiatedSessions", activeSessions.size()));

            log.info("✅ System status check completed");
            return ResponseEntity.ok(status);

        } catch (Exception e) {
            log.error("❌ Error getting system status", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to get system status",
                    "message", e.getMessage()));
        }
    }

    /**
     * ✅ CHECK SPECIFIC CHARGER
     */
    @GetMapping("/charger/{ocppId}")
    public ResponseEntity<?> getChargerStatus(@PathVariable String ocppId) {
        Map<String, Object> status = new HashMap<>();

        try {
            // Check WebSocket connection
            Map<String, WebSocket> connected = ocppWebSocketServer.getConnectedChargers();
            boolean isConnected = connected.containsKey(ocppId);

            status.put("ocppId", ocppId);
            status.put("wsConnected", isConnected);

            if (isConnected) {
                WebSocket ws = connected.get(ocppId);
                status.put("websocket", Map.of(
                        "open", ws.isOpen(),
                        "address", ws.getRemoteSocketAddress().toString()));
            } else {
                status.put("websocket", "NOT_CONNECTED");
            }

            // Check database
            Optional<Charger> chargerOpt = chargerRepository.findByOcppId(ocppId);

            if (chargerOpt.isPresent()) {
                Charger c = chargerOpt.get();
                Map<String, Object> dbInfo = new HashMap<>();
                dbInfo.put("id", c.getId());
                dbInfo.put("ocppId", c.getOcppId());
                dbInfo.put("available", c.isAvailability());
                dbInfo.put("occupied", c.isOccupied());
                dbInfo.put("rate", c.getRate());
                status.put("database", dbInfo);

                // Recent sessions
                List<Session> recentSessions = sessionRepository.findAll().stream()
                        .filter(s -> s.getCharger().getId().equals(c.getId()))
                        .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                        .limit(5)
                        .collect(Collectors.toList());

                List<Map<String, Object>> sessionList = new ArrayList<>();
                for (Session s : recentSessions) {
                    Map<String, Object> sInfo = new HashMap<>();
                    sInfo.put("id", s.getId());
                    sInfo.put("status", s.getStatus());
                    sInfo.put("createdAt", s.getCreatedAt().toString());
                    sessionList.add(sInfo);
                }
                status.put("recentSessions", sessionList);
            } else {
                status.put("database", "CHARGER_NOT_FOUND");
            }

            log.info("Charger status for {}: connected={}", ocppId, isConnected);
            return ResponseEntity.ok(status);

        } catch (Exception e) {
            log.error("Error getting charger status for {}", ocppId, e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to get charger status",
                    "message", e.getMessage()));
        }
    }

    /**
     * ✅ SEND TEST COMMAND
     */
    @PostMapping("/send-command/{ocppId}")
    public ResponseEntity<?> sendTestCommand(
            @PathVariable String ocppId,
            @RequestParam(defaultValue = "GetConfiguration") String action) {

        try {
            log.info("📤 Sending test command to {}: action={}", ocppId, action);

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.node.ObjectNode payload = mapper.createObjectNode();

            boolean sent = ocppWebSocketServer.sendRemoteCommand(ocppId, action, payload, java.util.UUID.randomUUID().toString());

            if (sent) {
                log.info("✅ Test command sent successfully");
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Command sent successfully",
                        "ocppId", ocppId,
                        "action", action,
                        "note", "Check server logs for charger response"));
            } else {
                log.error("❌ Failed to send command - charger not connected");
                return ResponseEntity.status(503).body(Map.of(
                        "error", "Failed to send command",
                        "ocppId", ocppId,
                        "reason", "Charger not connected or WebSocket closed"));
            }

        } catch (Exception e) {
            log.error("❌ Error sending test command", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Internal error",
                    "message", e.getMessage()));
        }
    }

    /**
     * ✅ LIST ALL WEBSOCKET CONNECTIONS
     */
    @GetMapping("/connections")
    public ResponseEntity<?> getAllConnections() {
        try {
            Map<String, WebSocket> connected = ocppWebSocketServer.getConnectedChargers();

            List<Map<String, Object>> connections = new ArrayList<>();
            for (Map.Entry<String, WebSocket> entry : connected.entrySet()) {
                Map<String, Object> conn = new HashMap<>();
                conn.put("ocppId", entry.getKey());
                conn.put("isOpen", entry.getValue().isOpen());
                conn.put("remoteAddress", entry.getValue().getRemoteSocketAddress().toString());
                connections.add(conn);
            }

            return ResponseEntity.ok(Map.of(
                    "total", connections.size(),
                    "connections", connections));

        } catch (Exception e) {
            log.error("Error getting connections", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage()));
        }
    }

    /**
     * ✅ QUICK CONNECTION CHECK
     */
    @GetMapping("/is-connected/{ocppId}")
    public ResponseEntity<?> isChargerConnected(@PathVariable String ocppId) {
        try {
            Map<String, WebSocket> connected = ocppWebSocketServer.getConnectedChargers();
            boolean isConnected = connected.containsKey(ocppId);

            if (isConnected) {
                WebSocket ws = connected.get(ocppId);
                return ResponseEntity.ok(Map.of(
                        "connected", true,
                        "open", ws.isOpen(),
                        "address", ws.getRemoteSocketAddress().toString()));
            } else {
                return ResponseEntity.ok(Map.of(
                        "connected", false,
                        "message", "Charger " + ocppId + " is not connected"));
            }

        } catch (Exception e) {
            log.error("Error checking connections for {}", ocppId, e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage()));
        }
    }

    /**
     * ✅ CONNECTION HEALTH - Ping-Pong monitoring
     * Shows last pong time and connection health for each connected charger.
     */
    @GetMapping("/connection-health")
    public ResponseEntity<?> getConnectionHealth() {
        try {
            Map<String, WebSocket> connected = ocppWebSocketServer.getConnectedChargers();
            List<Map<String, Object>> healthList = new ArrayList<>();

            for (Map.Entry<String, WebSocket> entry : connected.entrySet()) {
                String ocppId = entry.getKey();
                WebSocket ws = entry.getValue();

                Map<String, Object> info = new LinkedHashMap<>();
                info.put("ocppId", ocppId);
                info.put("connected", ws.isOpen());
                info.put("remoteAddress", ws.getRemoteSocketAddress() != null
                        ? ws.getRemoteSocketAddress().toString() : "unknown");

                Instant lastPong = connectionManager.getLastPongTime(ocppId);
                info.put("lastPongTime", lastPong != null ? lastPong.toString() : "never");

                if (lastPong != null) {
                    long secondsAgo = Duration.between(lastPong, Instant.now()).getSeconds();
                    info.put("secondsSinceLastPong", secondsAgo);
                    info.put("health", secondsAgo < 120 ? "HEALTHY" : "DEGRADED");
                } else {
                    info.put("secondsSinceLastPong", "N/A");
                    info.put("health", "UNKNOWN");
                }

                healthList.add(info);
            }

            return ResponseEntity.ok(Map.of(
                    "timestamp", Instant.now().toString(),
                    "totalConnected", connected.size(),
                    "chargers", healthList));

        } catch (Exception e) {
            log.error("Error getting connection health", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage()));
        }
    }
}
