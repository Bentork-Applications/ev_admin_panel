package com.bentork.ev_system.service;

import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.interfaces.IChargerCommandService;
import com.bentork.ev_system.service.ocpp.OcppConnectionManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Encapsulates OCPP remote command logic (RemoteStartTransaction, RemoteStopTransaction).
 * Depends on OcppWebSocketServer for transport but is itself a thin adapter,
 * breaking the circular dependency that previously existed between
 * SessionService ↔ OcppWebSocketServer.
 *
 * Generates a unique messageId for each command and registers it with
 * OcppConnectionManager for CALL_RESULT/CALL_ERROR correlation.
 */
@Slf4j
@Service
public class ChargerCommandService implements IChargerCommandService {

    private final OcppWebSocketServer ocppWebSocketServer;
    private final OcppConnectionManager connectionManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChargerCommandService(@Lazy OcppWebSocketServer ocppWebSocketServer,
                                 OcppConnectionManager connectionManager) {
        this.ocppWebSocketServer = ocppWebSocketServer;
        this.connectionManager = connectionManager;
    }

    @Override
    public boolean sendRemoteStart(Session session) {
        String ocppId = session.getCharger().getOcppId();
        if (ocppId == null || ocppId.isEmpty()) {
            log.error("Cannot send RemoteStartTransaction: charger OCPP ID is null/empty");
            return false;
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("idTag", "SESSION_" + session.getId());
            payload.put("connectorId", 1); // Required by many charger firmwares

            String messageId = UUID.randomUUID().toString();

            log.info("Sending RemoteStartTransaction to {}: idTag=SESSION_{}, messageId={}",
                    ocppId, session.getId(), messageId);

            // Track the pending command so we can correlate the charger's CALL_RESULT
            connectionManager.trackCommand(messageId, "RemoteStartTransaction", session.getId(), ocppId);

            boolean sent = ocppWebSocketServer.sendRemoteCommand(ocppId, "RemoteStartTransaction", payload, messageId);

            if (sent) {
                log.info("✅ RemoteStartTransaction sent successfully to charger: {} (messageId={})", ocppId, messageId);
            } else {
                log.error("❌ Failed to send RemoteStartTransaction: Charger {} not connected", ocppId);
                connectionManager.removePendingCommand(messageId); // Clean up tracking
            }
            return sent;
        } catch (Exception e) {
            log.error("❌ Error sending RemoteStartTransaction to {}: {}", ocppId, e.getMessage(), e);
            return false;
        }
    }

    @Override
    public boolean sendRemoteStop(Session session) {
        String ocppId = session.getCharger().getOcppId();

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("transactionId", session.getId().intValue());

            String messageId = UUID.randomUUID().toString();

            // Track the pending command so we can correlate the charger's CALL_RESULT
            connectionManager.trackCommand(messageId, "RemoteStopTransaction", session.getId(), ocppId);

            boolean sent = ocppWebSocketServer.sendRemoteCommand(ocppId, "RemoteStopTransaction", payload, messageId);

            if (sent) {
                log.info("✅ RemoteStopTransaction sent to charger: {}, txId: {} (messageId={})",
                        ocppId, session.getId(), messageId);
            } else {
                log.warn("⚠️ Failed to send RemoteStopTransaction to charger: {}", ocppId);
                connectionManager.removePendingCommand(messageId); // Clean up tracking
            }
            return sent;
        } catch (Exception e) {
            log.error("Error sending RemoteStopTransaction to {}: {}", ocppId, e.getMessage());
            return false;
        }
    }
}
