package com.bentork.ev_system.controller;

import java.math.BigDecimal;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.interfaces.IRFIDChargingService;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rfid")
public class RFIDChargingController {
    private final IRFIDChargingService chargingService;

    @PostMapping("/start")
    public ResponseEntity<Session> start(@RequestBody Map<String, Object> req) {
        String cardNumber = req.get("cardNumber").toString();
        Long chargerId = Long.valueOf(req.get("chargerId").toString());
        String boxId = req.get("boxId").toString();

        log.info("POST /api/rfid/start - Starting charging session, cardNumber={}, chargerId={}, boxId={}",
                cardNumber, chargerId, boxId);

        try {
            Session session = chargingService.startCharging(cardNumber, chargerId, boxId);
            log.info("POST /api/rfid/start - Success, sessionId={}, userId={}",
                    session.getId(), session.getUser().getId());
            return ResponseEntity.ok(session);
        } catch (RuntimeException e) {
            log.error("POST /api/rfid/start - Failed, cardNumber={}, chargerId={}: {}",
                    cardNumber, chargerId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("POST /api/rfid/start - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/update-energy")
    public ResponseEntity<Session> updateEnergy(@RequestBody Map<String, Object> req) {
        Long sessionId = Long.valueOf(req.get("sessionId").toString());
        BigDecimal currentKwh = new BigDecimal(req.get("currentKwh").toString());

        log.info("POST /api/rfid/update-energy - Updating energy, sessionId={}, currentKwh={}",
                sessionId, currentKwh);

        try {
            Session session = chargingService.updateEnergy(sessionId, currentKwh);
            log.info("POST /api/rfid/update-energy - Success, sessionId={}, totalEnergy={}, totalCost={}",
                    sessionId, session.getEnergyKwh(), session.getCost());
            return ResponseEntity.ok(session);
        } catch (RuntimeException e) {
            log.error("POST /api/rfid/update-energy - Failed, sessionId={}: {}",
                    sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("POST /api/rfid/update-energy - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/stop/{sessionId}")
    public ResponseEntity<Session> stop(@PathVariable Long sessionId) {
        log.info("POST /api/rfid/stop/{} - Stopping charging session", sessionId);

        try {
            Session session = chargingService.stopCharging(sessionId);
            log.info("POST /api/rfid/stop/{} - Success, totalEnergy={}, totalCost={}, status={}",
                    sessionId, session.getEnergyKwh(), session.getCost(), session.getStatus());
            return ResponseEntity.ok(session);
        } catch (RuntimeException e) {
            log.error("POST /api/rfid/stop/{} - Failed: {}", sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("POST /api/rfid/stop/{} - Failed: {}", sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}