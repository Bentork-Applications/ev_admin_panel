package com.bentork.ev_system.service.ocpp.handler;

import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.ReceiptRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.PushNotificationService;
import com.bentork.ev_system.service.interfaces.IRFIDChargingService;
import com.bentork.ev_system.service.interfaces.ISessionService;
import com.bentork.ev_system.service.SessionReminderService;
import com.bentork.ev_system.service.ocpp.OcppActionHandler;
import com.bentork.ev_system.service.ocpp.OcppConnectionManager;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeterValuesHandler implements OcppActionHandler {

    private final ISessionService sessionService;
    private final IRFIDChargingService rfidChargingService;
    private final SessionRepository sessionRepository;
    private final OcppConnectionManager connectionManager;
    private final ObjectMapper objectMapper;
    private final SessionReminderService sessionReminderService;
    private final PushNotificationService pushNotificationService;
    private final ReceiptRepository receiptRepository;

    @Override
    public String getAction() {
        return "MeterValues";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        try {
            int transactionId = payload.has("transactionId") ? payload.get("transactionId").asInt() : -1;

            if (transactionId == -1) {
                log.debug("MeterValues without transactionId (heartbeat meter)");
                return objectMapper.createObjectNode();
            }

            // Log charger-reported timestamps from meterValue entries for audit trail
            logMeterValueTimestamps(payload, ocppId, transactionId);

            log.info("MeterValues received - Raw payload: {}", payload.toString());
            logAllMeasurands(payload);

            BigDecimal currentAbsKwh = extractEnergyFromMeterValues(payload);
            Double currentSoc = extractSocFromMeterValues(payload);

            if (currentAbsKwh == null && currentSoc == null) {
                log.debug("MeterValues - no energy or SoC measurand found");
                return objectMapper.createObjectNode();
            }

            Long sessionId = connectionManager.getSessionIdForTransaction(transactionId);
            if (sessionId == null) {
                sessionId = (long) transactionId;
            }

            Session session = sessionService.getSessionById(sessionId);
            if (session == null) {
                log.warn("Session {} not found for meter update", sessionId);
                return objectMapper.createObjectNode();
            }

            if (currentSoc != null) {
                log.info("SoC Update: SessionId={}, SoC={}%", sessionId, currentSoc);
                sessionReminderService.checkAndSendFullyChargedNotification(sessionId, currentSoc);
            }

            if (currentAbsKwh != null) {
                log.debug("MeterValues - SessionId: {}, CurrentAbsKwh: {}, Source: {}",
                        sessionId, currentAbsKwh, session.getSourceType());

                if ("RFID".equals(session.getSourceType())) {
                Session updated = rfidChargingService.updateEnergy(sessionId, currentAbsKwh);

                Long durationSeconds = extractDurationFromMeterValues(payload);
                if (durationSeconds != null) {
                    updated.setChargingDurationSeconds(durationSeconds);
                    sessionRepository.save(updated);
                    log.info("RFID Duration Update: SessionId={}, DurationSeconds={}", sessionId, durationSeconds);
                }

                // === FCM: Real-time session progress update (RFID) ===
                calculateAndSendSessionUpdate(updated, sessionId, currentSoc);

                if (SessionStatus.COMPLETED.matches(updated.getStatus())) {
                    log.warn("RFID session {} auto-stopped due to low balance", sessionId);
                    connectionManager.removeTransaction(transactionId);
                    // Note: RemoteStopTransaction will be sent by the caller (OcppWebSocketServer)
                }
            } else {
                Double startKwh = session.getStartMeterReading();
                if (startKwh == null) {
                    Double startMeterWh = connectionManager.getMeterStart(sessionId);
                    startKwh = startMeterWh / 1000.0;
                }

                double rawConsumed = currentAbsKwh.doubleValue() - startKwh;
                double consumedKwh = Math.round(rawConsumed * 1000.0) / 1000.0;

                if (consumedKwh < 0) {
                    log.warn("Negative consumption detected (Meter reset?): Current={}, Start={}.",
                            currentAbsKwh, startKwh);
                    if (session.getEnergyKwh() > 0) {
                        log.info("Falling back to previously accumulated energy: {} kWh", session.getEnergyKwh());
                        consumedKwh = session.getEnergyKwh();
                    } else {
                        consumedKwh = 0;
                    }
                }

                log.info("kWh Check: SessionId={}, AbsoluteMeter={}, StartMeter={}, Consumed={}",
                        sessionId, currentAbsKwh, startKwh, consumedKwh);

                session.setLastMeterReading(currentAbsKwh.doubleValue());
                session.setEnergyKwh(consumedKwh);

                Long durationSeconds = extractDurationFromMeterValues(payload);
                if (durationSeconds != null) {
                    session.setChargingDurationSeconds(durationSeconds);
                    log.info("Duration Update: SessionId={}, DurationSeconds={}", sessionId, durationSeconds);
                }

                sessionRepository.save(session);
                sessionReminderService.checkAndSendKwhReminder(sessionId, consumedKwh);
                sessionService.checkAndStopIfReachedKwh(sessionId, consumedKwh);

                // === FCM: Real-time session progress update (APP session) ===
                calculateAndSendSessionUpdate(session, sessionId, currentSoc);
            }
            } // end if (currentAbsKwh != null)

            return objectMapper.createObjectNode();

        } catch (Exception e) {
            log.error("Error handling MeterValues: {}", e.getMessage(), e);
            return objectMapper.createObjectNode();
        }
    }

    /**
     * Calculates session progress and sends a data-only FCM update for the
     * persistent progress bar notification on the mobile app.
     *
     * Progress is computed differently based on session type:
     *   - Plan (time-based): elapsed / totalDuration × 100
     *   - Custom kWh:        consumed / targetKwh × 100
     *   - RFID:              SoC if available, else indeterminate (-1)
     */
    private void calculateAndSendSessionUpdate(
            Session session, Long sessionId, Double currentSoc) {

        if (session.getUser() == null || session.getUser().getFcmToken() == null) {
            return;
        }

        int progress = -1;  // -1 = indeterminate (app shows pulsing bar)
        String progressType = "INDETERMINATE";
        String targetValue = "0";

        try {
            if ("RFID".equals(session.getSourceType())) {
                // RFID: no prepaid target — use SoC if available
                if (currentSoc != null && currentSoc > 0) {
                    progress = Math.min(currentSoc.intValue(), 100);
                    progressType = "SOC";
                    targetValue = "100";
                }
                // else stays indeterminate
            } else {
                // APP session — look up receipt for target
                Receipt receipt = receiptRepository.findBySession(session).orElse(null);
                if (receipt != null) {
                    if (receipt.getSelectedKwh() != null) {
                        // kWh-based session
                        double target = receipt.getSelectedKwh().doubleValue();
                        double consumed = session.getEnergyKwh();
                        progress = (int) Math.min((consumed / target) * 100, 100);
                        progressType = "KWH";
                        targetValue = receipt.getSelectedKwh().toPlainString();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to calculate progress for session {}: {}",
                    sessionId, e.getMessage());
        }

        pushNotificationService.sendDataOnlyNotification(
            session.getUser().getFcmToken(),
            Map.of(
                "type",             "SESSION_UPDATE",
                "sessionId",        String.valueOf(sessionId),
                "progress",         String.valueOf(progress),
                "progressType",     progressType,
                "targetValue",      targetValue,
                "soc",              String.valueOf(
                                        currentSoc != null ? currentSoc.intValue() : 0),
                "energyKwh",        String.valueOf(session.getEnergyKwh()),
                "durationSeconds",  String.valueOf(
                                        session.getChargingDurationSeconds() != null
                                            ? session.getChargingDurationSeconds() : 0),
                "status",           "CHARGING"
            )
        );
    }

    private BigDecimal extractEnergyFromMeterValues(JsonNode payload) {
        try {
            if (!payload.has("meterValue")) return null;
            JsonNode meterValues = payload.get("meterValue");
            if (!meterValues.isArray()) return null;

            for (JsonNode meterValue : meterValues) {
                if (!meterValue.has("sampledValue")) continue;
                JsonNode sampledValues = meterValue.get("sampledValue");
                if (!sampledValues.isArray()) continue;

                for (JsonNode sample : sampledValues) {
                    if (!sample.has("measurand")) continue;
                    String measurand = sample.get("measurand").asText();

                    if ("Energy.Active.Import.Register".equals(measurand)) {
                        String valueStr = sample.get("value").asText();
                        BigDecimal value = new BigDecimal(valueStr);
                        String unit = sample.has("unit") ? sample.get("unit").asText() : "Wh";

                        if ("kWh".equalsIgnoreCase(unit)) {
                            return value;
                        } else {
                            return value.divide(BigDecimal.valueOf(1000), 4, RoundingMode.HALF_UP);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing meter values: {}", e.getMessage());
        }
        return null;
    }

    private Double extractSocFromMeterValues(JsonNode payload) {
        try {
            if (!payload.has("meterValue")) return null;
            JsonNode meterValues = payload.get("meterValue");
            if (!meterValues.isArray()) return null;

            for (JsonNode meterValue : meterValues) {
                if (!meterValue.has("sampledValue")) continue;
                JsonNode sampledValues = meterValue.get("sampledValue");
                if (!sampledValues.isArray()) continue;

                for (JsonNode sample : sampledValues) {
                    if (!sample.has("measurand")) continue;
                    String measurand = sample.get("measurand").asText();

                    if ("SoC".equals(measurand)) {
                        return Double.parseDouble(sample.get("value").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing SoC from meter values: {}", e.getMessage());
        }
        return null;
    }

    private Long extractDurationFromMeterValues(JsonNode payload) {
        try {
            if (!payload.has("meterValue")) return null;
            JsonNode meterValues = payload.get("meterValue");
            if (!meterValues.isArray()) return null;

            for (JsonNode meterValue : meterValues) {
                if (!meterValue.has("sampledValue")) continue;
                JsonNode sampledValues = meterValue.get("sampledValue");
                if (!sampledValues.isArray()) continue;

                for (JsonNode sample : sampledValues) {
                    if (!sample.has("measurand")) continue;
                    if ("Transaction.Duration".equals(sample.get("measurand").asText())) {
                        return Long.parseLong(sample.get("value").asText());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error parsing duration from meter values: {}", e.getMessage());
        }
        return null;
    }

    private void logAllMeasurands(JsonNode payload) {
        try {
            if (!payload.has("meterValue")) return;
            JsonNode meterValues = payload.get("meterValue");
            if (!meterValues.isArray()) return;

            StringBuilder sb = new StringBuilder("Available measurands: ");
            for (JsonNode meterValue : meterValues) {
                if (!meterValue.has("sampledValue")) continue;
                JsonNode sampledValues = meterValue.get("sampledValue");
                if (!sampledValues.isArray()) continue;

                for (JsonNode sample : sampledValues) {
                    String measurand = sample.has("measurand") ? sample.get("measurand").asText() : "DEFAULT";
                    String value = sample.has("value") ? sample.get("value").asText() : "N/A";
                    String unit = sample.has("unit") ? sample.get("unit").asText() : "N/A";
                    sb.append(String.format("[%s=%s %s] ", measurand, value, unit));
                }
            }
            log.info(sb.toString());
        } catch (Exception e) {
            log.error("Error logging measurands: {}", e.getMessage());
        }
    }

    /**
     * Log charger-reported timestamps from MeterValues entries.
     * Per OCPP 1.6, each meterValue entry contains a "timestamp" field
     * indicating when the charger took the measurement.
     * This provides an audit trail and helps detect clock drift.
     */
    private void logMeterValueTimestamps(JsonNode payload, String ocppId, int transactionId) {
        try {
            if (!payload.has("meterValue")) return;
            JsonNode meterValues = payload.get("meterValue");
            if (!meterValues.isArray()) return;

            for (JsonNode meterValue : meterValues) {
                String timestamp = meterValue.has("timestamp")
                        ? meterValue.get("timestamp").asText() : "N/A";
                log.info("MeterValues charger timestamp - OCPP_ID: {}, TxId: {}, ChargerTime: {}",
                        ocppId, transactionId, timestamp);
            }
        } catch (Exception e) {
            log.debug("Error reading meter value timestamps: {}", e.getMessage());
        }
    }
}
