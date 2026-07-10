package com.bentork.ev_system.service.ocpp;

import org.java_websocket.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages OCPP WebSocket connections and transaction/session mappings.
 * Extracted from OcppWebSocketServer to centralize connection state.
 */
@Service
public class OcppConnectionManager {

    private static final Logger log = LoggerFactory.getLogger(OcppConnectionManager.class);

    private final Map<WebSocket, String> connectionToOcppIdMap = new ConcurrentHashMap<>();
    private final Map<String, WebSocket> ocppIdToConnectionMap = new ConcurrentHashMap<>();
    private final Map<String, Instant> lastPongTimeMap = new ConcurrentHashMap<>();
    private final Map<Integer, Long> transactionToSessionMap = new ConcurrentHashMap<>();
    private final Map<Long, Double> sessionToMeterStartMap = new ConcurrentHashMap<>();
    private final Map<String, PendingCommand> pendingCommands = new ConcurrentHashMap<>();

    /**
     * Represents a pending OCPP command awaiting a CALL_RESULT or CALL_ERROR from the charger.
     */
    public static class PendingCommand {
        private final String action;
        private final Long sessionId;
        private final String ocppId;
        private final Instant sentAt;

        public PendingCommand(String action, Long sessionId, String ocppId) {
            this.action = action;
            this.sessionId = sessionId;
            this.ocppId = ocppId;
            this.sentAt = Instant.now();
        }

        public String getAction() { return action; }
        public Long getSessionId() { return sessionId; }
        public String getOcppId() { return ocppId; }
        public Instant getSentAt() { return sentAt; }

        @Override
        public String toString() {
            return "PendingCommand{action='" + action + "', sessionId=" + sessionId +
                    ", ocppId='" + ocppId + "', sentAt=" + sentAt + "}";
        }
    }

    public void registerConnection(WebSocket conn, String ocppId) {
        connectionToOcppIdMap.put(conn, ocppId);
        WebSocket oldConn = ocppIdToConnectionMap.put(ocppId, conn);
        if (oldConn != null && oldConn != conn && oldConn.isOpen()) {
            log.warn("Closing old ghost connection for charger {}", ocppId);
            oldConn.close(1000, "Replaced by new connection");
        }
        log.info("Charger connected: {} (OCPP ID: {})", conn.getRemoteSocketAddress(), ocppId);
    }

    public String removeConnection(WebSocket conn) {
        if (conn == null) return null;
        String ocppId = connectionToOcppIdMap.remove(conn);
        if (ocppId != null) {
            // Only remove from active map if the closing connection is the currently registered one
            if (conn.equals(ocppIdToConnectionMap.get(ocppId))) {
                ocppIdToConnectionMap.remove(ocppId);
                lastPongTimeMap.remove(ocppId);
            } else {
                log.info("Skipped removing ocppIdToConnectionMap entry for {} because a newer connection exists", ocppId);
            }
        }
        return ocppId;
    }

    public String getOcppId(WebSocket conn) {
        if (conn == null) return "SERVER";
        return connectionToOcppIdMap.getOrDefault(conn, "UNKNOWN");
    }

    public WebSocket getConnection(String ocppId) {
        return ocppIdToConnectionMap.get(ocppId);
    }

    public Map<String, WebSocket> getConnectedChargers() {
        return Map.copyOf(ocppIdToConnectionMap);
    }

    // Ping-Pong tracking

    /**
     * Records the last time a pong was received from a charger.
     */
    public void updateLastPongTime(String ocppId) {
        lastPongTimeMap.put(ocppId, Instant.now());
    }

    /**
     * Returns the last pong timestamp for a charger, or null if never received.
     */
    public Instant getLastPongTime(String ocppId) {
        return lastPongTimeMap.get(ocppId);
    }

    /**
     * Returns a snapshot of all charger last-pong timestamps.
     */
    public Map<String, Instant> getAllLastPongTimes() {
        return Map.copyOf(lastPongTimeMap);
    }

    // Pending command tracking

    /**
     * Track a pending command so its CALL_RESULT/CALL_ERROR can be correlated.
     */
    public void trackCommand(String messageId, String action, Long sessionId, String ocppId) {
        pendingCommands.put(messageId, new PendingCommand(action, sessionId, ocppId));
        log.debug("Tracking pending command: messageId={}, action={}, sessionId={}, ocppId={}",
                messageId, action, sessionId, ocppId);
    }

    /**
     * Remove and return the pending command for the given messageId.
     * Returns null if no pending command is found (e.g., already processed or unknown messageId).
     */
    public PendingCommand removePendingCommand(String messageId) {
        return pendingCommands.remove(messageId);
    }

    // Transaction-Session mapping
    public void mapTransaction(int transactionId, Long sessionId) {
        transactionToSessionMap.put(transactionId, sessionId);
    }

    public Long getSessionIdForTransaction(int transactionId) {
        return transactionToSessionMap.get(transactionId);
    }

    public void removeTransaction(int transactionId) {
        transactionToSessionMap.remove(transactionId);
    }

    // Meter start tracking
    public void setMeterStart(Long sessionId, double meterStart) {
        sessionToMeterStartMap.put(sessionId, meterStart);
    }

    public double getMeterStart(Long sessionId) {
        return sessionToMeterStartMap.getOrDefault(sessionId, 0.0);
    }

    public void removeMeterStart(Long sessionId) {
        sessionToMeterStartMap.remove(sessionId);
    }

    /**
     * Periodically clean up pending commands that never received a response.
     * Runs every 5 minutes and removes commands older than 5 minutes.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    public void cleanupPendingCommands() {
        Instant threshold = Instant.now().minusSeconds(300);
        pendingCommands.entrySet().removeIf(entry -> {
            if (entry.getValue().getSentAt().isBefore(threshold)) {
                log.warn("Removing expired pending command: messageId={}, action={}, charger={}",
                        entry.getKey(), entry.getValue().getAction(), entry.getValue().getOcppId());
                return true;
            }
            return false;
        });
    }
}
