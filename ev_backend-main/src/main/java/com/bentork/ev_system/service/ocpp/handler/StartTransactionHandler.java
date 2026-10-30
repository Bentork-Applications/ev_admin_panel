package com.bentork.ev_system.service.ocpp.handler;

import com.bentork.ev_system.enums.ChargerStatus;
import com.bentork.ev_system.exception.domain.ChargerNotFoundException;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.ReceiptRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.interfaces.IRFIDChargingService;
import com.bentork.ev_system.service.interfaces.ISessionService;
import com.bentork.ev_system.service.ocpp.OcppActionHandler;
import com.bentork.ev_system.service.ocpp.OcppConnectionManager;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

@Slf4j
@Component
@RequiredArgsConstructor
public class StartTransactionHandler implements OcppActionHandler {

    private final ISessionService sessionService;
    private final IRFIDChargingService rfidChargingService;
    private final ChargerRepository chargerRepository;
    private final ReceiptRepository receiptRepository;
    private final SessionRepository sessionRepository;
    private final OcppConnectionManager connectionManager;
    private final ObjectMapper objectMapper;

    @Override
    public String getAction() {
        return "StartTransaction";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        try {
            String idTag = payload.has("idTag") ? payload.get("idTag").asText() : null;
            int connectorId = payload.has("connectorId") ? payload.get("connectorId").asInt() : 1;
            double meterStart = payload.has("meterStart") ? payload.get("meterStart").asDouble() : 0.0;
            String rawTimestamp = payload.has("timestamp") ? payload.get("timestamp").asText() : null;
            LocalDateTime chargerTimestamp = parseOcppTimestamp(rawTimestamp);

            log.info("StartTransaction - OCPP_ID: {}, IdTag: {}, ConnectorId: {}, MeterStart: {}, Timestamp: {} (raw: {})",
                    ocppId, idTag, connectorId, meterStart, chargerTimestamp, rawTimestamp);

            Charger charger = chargerRepository.findByOcppId(ocppId)
                    .orElseThrow(() -> new ChargerNotFoundException(ocppId));

            Session session = null;
            String sessionType = "UNKNOWN";

            // Strategy 1: App-initiated session (idTag starts with "SESSION_")
            // When the backend sends RemoteStartTransaction, it uses idTag = "SESSION_<id>"
            // The charger echoes this idTag in its StartTransaction call
            if (idTag != null && idTag.startsWith("SESSION_")) {
                log.info("App-initiated session detected (idTag: {}), activating via activateOrRejectSession...", idTag);
                try {
                    session = sessionService.activateOrRejectSession(ocppId);
                    if (session != null) {
                        Receipt linkedReceipt = receiptRepository.findBySession(session).orElse(null);
                        sessionType = linkedReceipt != null && "MONEY_BASED".equals(linkedReceipt.getSessionType()) ? "MONEY_BASED" : "CUSTOM";
                        log.info("{} session activated under lock (sessionId: {})", sessionType, session.getId());
                    } else {
                        log.warn("No initiated/active session found for app idTag {} on charger {}", idTag, ocppId);
                    }
                } catch (Exception ex) {
                    log.warn("App session activation failed for idTag {}: {}", idTag, ex.getMessage());
                }
            }

            // Strategy 2: RFID Card Flow (only if NOT an app-initiated session)
            if (session == null && idTag != null && !idTag.isEmpty() && !idTag.startsWith("SESSION_")) {
                try {
                    session = rfidChargingService.startCharging(idTag, charger.getId(), ocppId);
                    sessionType = "RFID";
                    log.info("RFID session started (sessionId: {})", session.getId());
                } catch (Exception ex) {
                    log.warn("RFID flow failed: {}", ex.getMessage());
                }
            }

            // Strategy 3: Prepaid Flow fallback (no matching app or RFID session found)
            if (session == null) {
                try {
                    session = sessionService.activateOrRejectSession(ocppId);
                    if (session != null) {
                        Receipt linkedReceipt = receiptRepository.findBySession(session).orElse(null);
                        sessionType = linkedReceipt != null && "MONEY_BASED".equals(linkedReceipt.getSessionType()) ? "MONEY_BASED" : "CUSTOM";
                        log.info("{} session activated under lock (sessionId: {})", sessionType, session.getId());
                    }
                } catch (Exception ex) {
                    log.debug("No active/initiated session found: {}", ex.getMessage());
                }
            }

            // Strategy 4: Look for PAID receipt without session (fallback)
            if (session == null) {
                try {
                    Receipt receipt = receiptRepository
                            .findFirstByChargerAndStatusOrderByCreatedAtDesc(charger, "PAID")
                            .orElse(null);

                    if (receipt != null && receipt.getSession() == null) {
                        session = sessionService.startSessionFromReceipt(receipt, ocppId);
                        sessionType = "MONEY_BASED".equals(receipt.getSessionType()) ? "MONEY_BASED" : "CUSTOM";
                        log.info("{} session started from receipt (sessionId: {})", sessionType, session.getId());
                    }
                } catch (Exception ex) {
                    log.debug("No prepaid receipt found: {}", ex.getMessage());
                }
            }

            // Strategy 5: No valid payment method
            if (session == null) {
                log.warn("No RFID or prepaid session found for charger {}", ocppId);
                throw new RuntimeException("No valid payment method found. Please use RFID card or prepay via app.");
            }

            // Store meter start value and charger-reported timestamp
            double startKwh = meterStart / 1000.0;
            session.setStartMeterReading(startKwh);
            session.setLastMeterReading(startKwh);

            // Use charger-reported timestamp instead of server time for accurate start time.
            // This is critical for offline-queued messages or clock drift scenarios.
            session.setStartTime(chargerTimestamp);
            log.info("Session {} startTime set from charger timestamp: {}", session.getId(), chargerTimestamp);

            sessionRepository.save(session);

            connectionManager.setMeterStart(session.getId(), meterStart);

            // Map transaction to session
            int transactionId = session.getId().intValue();
            connectionManager.mapTransaction(transactionId, session.getId());

            log.info("Transaction mapping: TxId {} -> SessionId {} (Type: {})",
                    transactionId, session.getId(), sessionType);

            // Update charger status
            charger.setOccupied(true);
            charger.setAvailability(false);
            charger.setStatus(ChargerStatus.BUSY.getValue());
            chargerRepository.save(charger);

            // Build response
            ObjectNode idTagInfo = objectMapper.createObjectNode();
            idTagInfo.put("status", "Accepted");

            ObjectNode response = objectMapper.createObjectNode();
            response.put("transactionId", transactionId);
            response.set("idTagInfo", idTagInfo);
            return response;

        } catch (Exception e) {
            log.error("Error starting transaction: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to start transaction: " + e.getMessage(), e);
        }
    }

    /**
     * Parse an OCPP ISO 8601 timestamp string to LocalDateTime.
     * OCPP 1.6 spec uses ISO 8601 format (e.g., "2025-06-12T10:30:00Z" or "2025-06-12T10:30:00.000+05:30").
     * Falls back to server time if the timestamp is null, empty, or unparseable.
     */
    private LocalDateTime parseOcppTimestamp(String rawTimestamp) {
        if (rawTimestamp == null || rawTimestamp.isBlank()) {
            log.debug("No timestamp in payload, using server time");
            return LocalDateTime.now();
        }
        try {
            // Try parsing as OffsetDateTime first (handles "Z" and "+05:30" suffixes)
            OffsetDateTime odt = OffsetDateTime.parse(rawTimestamp);
            return odt.toLocalDateTime();
        } catch (DateTimeParseException e1) {
            try {
                // Fallback: try parsing as plain LocalDateTime (no timezone info)
                return LocalDateTime.parse(rawTimestamp);
            } catch (DateTimeParseException e2) {
                log.warn("Failed to parse OCPP timestamp '{}', using server time. Error: {}",
                        rawTimestamp, e2.getMessage());
                return LocalDateTime.now();
            }
        }
    }
}
