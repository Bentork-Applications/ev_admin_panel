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
import org.springframework.stereotype.Component;

import com.bentork.ev_system.service.interfaces.IMaintenanceService;

@Slf4j
@Component
@RequiredArgsConstructor
public class StatusNotificationHandler implements OcppActionHandler {

    private final ChargerRepository chargerRepository;
    private final ObjectMapper objectMapper;
    private final IMaintenanceService maintenanceService;

    @Override
    public String getAction() {
        return "StatusNotification";
    }

    @Override
    public ObjectNode handle(String ocppId, JsonNode payload) {
        int connectorId = payload.has("connectorId") ? payload.get("connectorId").asInt() : 0;
        String status = payload.has("status") ? payload.get("status").asText() : "Unknown";
        String errorCode = payload.has("errorCode") ? payload.get("errorCode").asText() : "NoError";
        String vendorErrorCode = payload.has("vendorErrorCode") ? payload.get("vendorErrorCode").asText() : "";

        log.info("StatusNotification - OCPP_ID: {}, Connector: {}, Status: {}, ErrorCode: {}",
                ocppId, connectorId, status, errorCode);

        try {
            Charger charger = chargerRepository.findByOcppId(ocppId).orElse(null);
            if (charger != null) {
                // MAINTENANCE GUARD: If charger is under maintenance, log but don't update status
                if (maintenanceService.isChargerUnderMaintenance(charger.getId())) {
                    log.info("Charger {} is under maintenance — ignoring OCPP status update. Reported: {}",
                            ocppId, status);
                    return objectMapper.createObjectNode();
                }

                ChargerStatus chargerStatus = ChargerStatus.fromString(status);
                charger.setStatus(chargerStatus.getValue());
                charger.setAvailability(chargerStatus == ChargerStatus.AVAILABLE);
                charger.setOccupied(chargerStatus == ChargerStatus.BUSY);
                chargerRepository.save(charger);

                log.info("Charger {} status updated to: {} (from OCPP: {})",
                        ocppId, chargerStatus.getValue(), status);

                if (chargerStatus == ChargerStatus.FAULTED) {
                    log.warn("ALERT: Charger {} is FAULTED! ErrorCode: {}, VendorErrorCode: {}. " +
                            "Possible causes: non-earth switch, emergency button pressed.",
                            ocppId, errorCode, vendorErrorCode);
                }
            }
        } catch (Exception e) {
            log.error("Error updating charger status: {}", e.getMessage());
        }

        return objectMapper.createObjectNode();
    }
}
