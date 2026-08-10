package com.bentork.ev_system.service;

import com.bentork.ev_system.enums.ChargerStatus;
import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.interfaces.IRFIDChargingService;
import com.bentork.ev_system.service.interfaces.ISessionService;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;
import com.bentork.ev_system.service.interfaces.IWalletTransactionService;
import com.bentork.ev_system.service.ocpp.OcppConnectionManager;
import com.bentork.ev_system.service.ocpp.OcppMessageRouter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.java_websocket.WebSocket;
import org.java_websocket.framing.Framedata;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.util.Map;

/**
 * Slim OCPP 1.6 WebSocket Server.
 * Delegates action handling to OcppMessageRouter and individual OcppActionHandlers.
 * Manages connections via OcppConnectionManager.
 *
 * After Phase 5 decomposition: ~200 lines (down from ~966).
 */
@Service
public class OcppWebSocketServer extends WebSocketServer {

    private static final Logger log = LoggerFactory.getLogger(OcppWebSocketServer.class);
    private static final int OCPP_CALL = 2;
    private static final int OCPP_CALL_RESULT = 3;
    private static final int OCPP_CALL_ERROR = 4;

    private final OcppConnectionManager connectionManager;
    private final OcppMessageRouter messageRouter;
    private final ISessionService sessionService;
    private final IRFIDChargingService rfidChargingService;
    private final IUserNotificationService userNotificationService;
    private final IWalletTransactionService walletTransactionService;
    private final ChargerRepository chargerRepository;
    private final SessionRepository sessionRepository;
    private final com.bentork.ev_system.repository.ReceiptRepository receiptRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OcppWebSocketServer(
            @Value("${ocpp.server.port:8887}") int port,
            @Value("${ocpp.websocket.ping.interval:30}") int pingInterval,
            @Value("${ocpp.websocket.pong.timeout:90}") int pongTimeout,
            OcppConnectionManager connectionManager,
            OcppMessageRouter messageRouter,
            ISessionService sessionService,
            IRFIDChargingService rfidChargingService,
            IUserNotificationService userNotificationService,
            IWalletTransactionService walletTransactionService,
            ChargerRepository chargerRepository,
            SessionRepository sessionRepository,
            com.bentork.ev_system.repository.ReceiptRepository receiptRepository) {
        super(new InetSocketAddress(port));
        this.connectionManager = connectionManager;
        this.messageRouter = messageRouter;
        this.sessionService = sessionService;
        this.rfidChargingService = rfidChargingService;
        this.userNotificationService = userNotificationService;
        this.walletTransactionService = walletTransactionService;
        this.chargerRepository = chargerRepository;
        this.sessionRepository = sessionRepository;
        this.receiptRepository = receiptRepository;

        // ★ FIX: Completely disable automatic WebSocket pings.
        // The charger firmware corrupts messages if a Ping frame and Text frame 
        // arrive together. Since 4G network buffering can delay packets and deliver 
        // them all at once, server-side delays aren't enough. 
        // Disabling pings completely prevents the bug from ever happening.
        setConnectionLostTimeout(0);
        
        // Allow rapid restarts by reusing the port even if stuck in TIME_WAIT
        setReuseAddr(true);

        log.info("OCPP 1.6 WebSocket Server initialized on ws://0.0.0.0:{}", port);
        log.info("Ping-Pong keep-alive: pingInterval={}s, pongTimeout={}s",
                pingInterval, pongTimeout);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String ocppId = extractOcppIdFromHandshake(conn, handshake);
        connectionManager.registerConnection(conn, ocppId);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        log.debug("Message from charger: {}", message);

        try {
            JsonNode messageArray = objectMapper.readTree(message);

            if (!messageArray.isArray() || messageArray.size() < 3) {
                log.warn("Invalid OCPP message format: {}", message);
                return;
            }

            int messageType = messageArray.get(0).asInt();

            if (messageType == OCPP_CALL) {
                String messageId = messageArray.get(1).asText();
                String action = messageArray.get(2).asText();
                JsonNode payload = messageArray.size() > 3 ? messageArray.get(3) : objectMapper.createObjectNode();
                String ocppId = connectionManager.getOcppId(conn);

                log.info("OCPP Call - Action: {}, MessageId: {}", action, messageId);

                try {
                    ObjectNode result = messageRouter.route(ocppId, action, payload);
                    if (result != null) {
                        sendCallResult(conn, messageId, result);
                    } else {
                        sendErrorResponse(conn, messageId, "NotSupported",
                                "Action '" + action + "' is not implemented");
                    }
                } catch (Exception e) {
                    log.error("Error handling OCPP call {}: {}", action, e.getMessage(), e);
                    sendErrorResponse(conn, messageId, "InternalError", e.getMessage());
                }
            } else if (messageType == OCPP_CALL_RESULT) {
                String messageId = messageArray.get(1).asText();
                JsonNode resultPayload = messageArray.size() > 2 ? messageArray.get(2) : objectMapper.createObjectNode();
                handleCallResult(messageId, resultPayload);
            } else if (messageType == OCPP_CALL_ERROR) {
                String messageId = messageArray.get(1).asText();
                String errorCode = messageArray.size() > 2 ? messageArray.get(2).asText() : "Unknown";
                String errorDesc = messageArray.size() > 3 ? messageArray.get(3).asText() : "";
                handleCallError(messageId, errorCode, errorDesc);
            } else {
                log.warn("Unknown OCPP message type: {}", messageType);
            }

        } catch (Exception e) {
            log.error("Error handling message: {}", e.getMessage(), e);
            sendErrorResponse(conn, "unknown", "InternalError", "Failed to process message");
        }
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String ocppId = connectionManager.removeConnection(conn);
        if (ocppId != null) {
            // Ghost Connection Bug Fix: Check if there's still an active connection for this charger
            WebSocket activeConn = connectionManager.getConnection(ocppId);
            if (activeConn != null && activeConn.isOpen()) {
                log.info("Old connection closed for charger {}, but a new active connection exists. Skipping OFFLINE and session stop logic.", ocppId);
                return;
            }

            String disconnectType = code == 1006 ? "PING-PONG TIMEOUT" : "NORMAL";
            log.warn("Charger {} disconnected [{}]. Code: {}, Remote: {}, Reason: {}. Checking for active sessions...",
                    ocppId, disconnectType, code, remote, reason);
            try {
                Charger charger = chargerRepository.findByOcppId(ocppId).orElse(null);
                if (charger != null) {
                    charger.setAvailability(false);
                    charger.setOccupied(false);
                    charger.setStatus(ChargerStatus.OFFLINE.getValue());
                    chargerRepository.save(charger);
                    log.info("Charger {} status set to OFFLINE", ocppId);

                    Session session = sessionRepository.findFirstByChargerAndStatusInOrderByCreatedAtDesc(
                            charger,
                            java.util.Arrays.asList(SessionStatus.ACTIVE.getValue(),
                                    SessionStatus.INITIATED.getValue()))
                            .orElse(null);

                    if (session != null) {
                        log.info("Stopping active session {} due to charger disconnection", session.getId());
                        if ("RFID".equalsIgnoreCase(session.getSourceType())) {
                            rfidChargingService.stopCharging(session.getId());
                        } else {
                            sessionService.stopSessionBySystem(session.getId());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error stopping session on close: {}", e.getMessage());
            }
        }
        log.info("Charger disconnected: {} (OCPP ID: {}, Code: {}, Remote: {}, Reason: {})",
                conn.getRemoteSocketAddress(), ocppId, code, remote, reason);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        String ocppId = connectionManager.getOcppId(conn);
        log.error("WebSocket error for charger {}: {}", ocppId, ex.getMessage(), ex);
    }

    @Override
    public void onStart() {
        log.info("OCPP WebSocket server ready and listening on port {}", getPort());
    }

    @Override
    public void onWebsocketPong(WebSocket conn, Framedata f) {
        String ocppId = connectionManager.getOcppId(conn);
        connectionManager.updateLastPongTime(ocppId);
        log.debug("Pong received from charger {} ({})", ocppId, conn.getRemoteSocketAddress());
    }

    // ===================== PUBLIC API =====================

    /**
     * Send a remote OCPP command (CALL, type=2) to a charger.
     * The messageId is provided by the caller (ChargerCommandService) for pending command tracking.
     */
    public boolean sendRemoteCommand(String ocppId, String action, ObjectNode payload, String messageId) {
        WebSocket conn = connectionManager.getConnection(ocppId);
        if (conn == null || !conn.isOpen()) {
            log.warn("Charger {} not connected", ocppId);
            return false;
        }

        try {
            ArrayNode message = objectMapper.createArrayNode();
            message.add(OCPP_CALL);
            message.add(messageId);
            message.add(action);
            message.add(payload);

            String messageStr = objectMapper.writeValueAsString(message);

            // ★ FIX: Guard against charger firmware bug where a WebSocket ping frame
            // and a text frame arriving at the same instant cause message corruption.
            // The charger sees garbled binary (��) instead of the JSON command.
            // A small delay ensures our command never collides with the auto-ping.
            try {
                Thread.sleep(500);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }

            conn.send(messageStr);
            log.info("Sent remote command to {}: {} (messageId={})", ocppId, action, messageId);
            return true;
        } catch (Exception e) {
            log.error("Error sending remote command to {}: {}", ocppId, e.getMessage(), e);
            return false;
        }
    }

    public Map<String, WebSocket> getConnectedChargers() {
        return connectionManager.getConnectedChargers();
    }

    // ===================== PRIVATE HELPERS =====================

    private void sendCallResult(WebSocket conn, String messageId, ObjectNode payload) {
        try {
            ArrayNode response = objectMapper.createArrayNode();
            response.add(OCPP_CALL_RESULT);
            response.add(messageId);
            response.add(payload);

            String responseStr = objectMapper.writeValueAsString(response);
            conn.send(responseStr);
            log.debug("Sent CallResult: {}", responseStr);
        } catch (Exception e) {
            log.error("Error sending CallResult: {}", e.getMessage(), e);
        }
    }

    private void sendErrorResponse(WebSocket conn, String messageId, String errorCode, String errorDescription) {
        try {
            ArrayNode response = objectMapper.createArrayNode();
            response.add(OCPP_CALL_ERROR);
            response.add(messageId);
            response.add(errorCode);
            response.add(errorDescription);
            response.add(objectMapper.createObjectNode());

            String responseStr = objectMapper.writeValueAsString(response);
            conn.send(responseStr);
            log.debug("Sent CallError: {}", responseStr);
        } catch (Exception e) {
            log.error("Error sending CallError: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle OCPP CALL_RESULT (type 3) — the charger's response to a command we sent.
     * Correlates the response with the pending command via messageId.
     */
    private void handleCallResult(String messageId, JsonNode resultPayload) {
        OcppConnectionManager.PendingCommand pending = connectionManager.removePendingCommand(messageId);

        if (pending == null) {
            log.debug("Received CALL_RESULT for unknown/already-processed messageId: {}", messageId);
            return;
        }

        String status = resultPayload.has("status") ? resultPayload.get("status").asText() : "Unknown";

        log.info("CALL_RESULT received - Action: {}, MessageId: {}, Status: {}, SessionId: {}, OcppId: {}",
                pending.getAction(), messageId, status, pending.getSessionId(), pending.getOcppId());

        if ("RemoteStartTransaction".equals(pending.getAction())) {
            if ("Accepted".equalsIgnoreCase(status)) {
                log.info("✅ Charger {} ACCEPTED RemoteStartTransaction for session {}",
                        pending.getOcppId(), pending.getSessionId());
                // The charger will now send StartTransaction CALL — handled by StartTransactionHandler
            } else {
                log.error("❌ Charger {} REJECTED RemoteStartTransaction for session {} (status={})",
                        pending.getOcppId(), pending.getSessionId(), status);
                handleRejectedRemoteStart(pending.getSessionId());
            }
        } else if ("RemoteStopTransaction".equals(pending.getAction())) {
            if ("Accepted".equalsIgnoreCase(status)) {
                log.info("✅ Charger {} ACCEPTED RemoteStopTransaction for session {}",
                        pending.getOcppId(), pending.getSessionId());
                // The charger will now send StopTransaction CALL — handled by StopTransactionHandler
            } else {
                log.warn("⚠️ Charger {} REJECTED RemoteStopTransaction for session {} (status={})",
                        pending.getOcppId(), pending.getSessionId(), status);
            }
        } else {
            log.info("CALL_RESULT for action {}: {}", pending.getAction(), status);
        }
    }

    /**
     * Handle OCPP CALL_ERROR (type 4) — the charger returned an error for our command.
     */
    private void handleCallError(String messageId, String errorCode, String errorDescription) {
        OcppConnectionManager.PendingCommand pending = connectionManager.removePendingCommand(messageId);

        if (pending == null) {
            log.debug("Received CALL_ERROR for unknown/already-processed messageId: {}", messageId);
            return;
        }

        log.error("CALL_ERROR received - Action: {}, MessageId: {}, Error: {} ({}), SessionId: {}, OcppId: {}",
                pending.getAction(), messageId, errorCode, errorDescription,
                pending.getSessionId(), pending.getOcppId());

        if ("RemoteStartTransaction".equals(pending.getAction())) {
            handleRejectedRemoteStart(pending.getSessionId());
        }
    }

    /**
     * When the charger rejects or errors on RemoteStartTransaction,
     * fail the session and refund the user.
     */
    private void handleRejectedRemoteStart(Long sessionId) {
        try {
            Session session = sessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                log.warn("Cannot handle rejected RemoteStart: session {} not found", sessionId);
                return;
            }

            if (!SessionStatus.INITIATED.matches(session.getStatus())) {
                log.info("Session {} is no longer INITIATED (status={}), skipping rejection handling",
                        sessionId, session.getStatus());
                return;
            }

            // Mark session as FAILED
            session.setStatus(SessionStatus.FAILED.getValue());
            session.setEndTime(java.time.LocalDateTime.now());
            sessionRepository.save(session);

            // Refund the user
            com.bentork.ev_system.model.Receipt receipt = receiptRepository.findBySession(session).orElse(null);
            if (receipt != null && receipt.getAmount() != null
                    && receipt.getAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                walletTransactionService.credit(
                        session.getUser().getId(),
                        session.getId(),
                        receipt.getAmount(),
                        "Refund: Charger rejected start command");
                log.info("Refunded ₹{} to userId={} for rejected RemoteStart (sessionId={})",
                        receipt.getAmount(), session.getUser().getId(), sessionId);
            }

            // Notify user
            userNotificationService.createNotification(
                    session.getUser().getId(),
                    "Charging Failed",
                    "The charger rejected the start command. Your payment has been refunded.",
                    "ERROR");

            log.info("Session {} marked FAILED due to charger rejection, user refunded and notified", sessionId);

        } catch (Exception e) {
            log.error("Error handling rejected RemoteStart for session {}: {}", sessionId, e.getMessage(), e);
        }
    }

    private String extractOcppIdFromHandshake(WebSocket conn, ClientHandshake handshake) {
        log.info("onOpen: New connection detected. Trying to extract OCPP ID...");
        try {
            String resourceDescriptor = handshake.getResourceDescriptor();
            log.debug("onOpen: Handshake ResourceDescriptor: {}", resourceDescriptor);

            if (resourceDescriptor != null && resourceDescriptor.length() > 1) {
                String path = resourceDescriptor.substring(1).split("\\?")[0];
                
                // Sanitize path: remove whitespace/newlines and trailing slashes
                path = path.trim().replaceAll("/+$", "");
                
                if (!path.isEmpty() && !path.equals("/")) {
                    // Extract the last segment in case the path is like /ocpp/1.6/CHARGER_ID
                    String[] segments = path.split("/");
                    String ocppId = segments[segments.length - 1];
                    
                    log.info("onOpen: Successfully extracted OCPP ID from path: {}", ocppId);
                    return ocppId;
                }
            }

            log.warn("onOpen: Could not extract ID from path. Creating safe fallback ID.");
            String remoteAddressStr = "UNKNOWN_ADDRESS";
            if (conn != null && conn.getRemoteSocketAddress() != null) {
                remoteAddressStr = conn.getRemoteSocketAddress().toString();
            }
            String fallbackId = "CHARGER-" + remoteAddressStr.replaceAll("[^a-zA-Z0-9-]", "");
            log.warn("onOpen: Using fallback ID: {}", fallbackId);
            return fallbackId;
        } catch (Exception e) {
            log.error("onOpen: CRITICAL ERROR during ID extraction", e);
            return "ID_EXTRACTION_FAILED";
        }
    }
}