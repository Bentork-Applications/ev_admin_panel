package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.ChargerDTO;
import com.bentork.ev_system.service.interfaces.IChargerService;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/chargers")
@Slf4j
public class ChargerController {

    private final IChargerService chargerService;

    public ChargerController(IChargerService chargerService) {
        this.chargerService = chargerService;
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<String> createCharger(@RequestBody ChargerDTO dto) {
        log.info("POST /api/chargers/add - Creating charger, ocppId={}, stationId={}", dto.getOcppId(),
                dto.getStationId());

        try {
            chargerService.createCharger(dto);
            log.info("POST /api/charges/add - Successfully created charger,  ocppId={}", dto.getOcppId());
            return ResponseEntity.status(HttpStatus.CREATED).body("Charger Created");
        } catch (EntityNotFoundException e) {
            log.warn("POST /api/chargers/add - Station not found: stationId={}", dto.getStationId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }

        catch (Exception e) {
            log.error("POST /api/chargers/add - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create charger");
        }

    }

    @GetMapping("/all")
    public ResponseEntity<List<ChargerDTO>> getAllChargers() {

        log.info("GET /api/chargers/all - Request recieved");

        try {
            List<ChargerDTO> chargers = chargerService.getAllChargers();
            log.info("GET /api/chargers/all - Success, returned {} chargers", chargers.size());
            return ResponseEntity.ok(chargers);
        } catch (Exception e) {
            log.error("GET /api/chargers/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChargerDTO> getChargerById(@PathVariable Long id) {
        log.info("GET /api/charges/{} - Request recieved", id);
        try {
            ChargerDTO charger = chargerService.getChargerById(id);
            log.info("GET /api/charges/{} - Success, ocppId={}", id, charger.getOcppId());
            return ResponseEntity.ok(charger);
        } catch (EntityNotFoundException e) {
            log.warn("GET /api/chargers/{} - Not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("GET /api/chargers/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<String> updateCharger(@PathVariable Long id, @RequestBody ChargerDTO dto) {
        log.info("PUT /api/charges/update/{} - Updating charger, occppId={}, type={}", id, dto.getOcppId(),
                dto.getChargerType());
        try {
            chargerService.updateCharger(id, dto);
            log.info("PUT /api/charges/update/{} - Success", id);
            return ResponseEntity.ok("Charger Updated");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/chargers/update/{} - Not found", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/chargers/update/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update charger");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteCharger(@PathVariable Long id) {
        log.info("DELETE /api/chargers/delete/{} - Request received", id);
        try {
            chargerService.deleteCharger(id);
            log.info("DELETE /api/chargers/delete/{} - Success (deactivated)", id);
            return ResponseEntity.ok("Charger Deactivated");
        } catch (EntityNotFoundException e) {
            log.warn("DELETE /api/chargers/delete/{} - Charger Not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("DELETE /api/chargers/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to deactivate charger");
        }
    }

    // Total Chargers
    @GetMapping("/total")
    public ResponseEntity<Long> getTotalChargers() {
        log.info("GET /api/chargers/total - Request received");
        try {
            Long total = chargerService.getTotalChargers();
            log.info("GET /api/chargers/total - Success, total={}", total);
            return ResponseEntity.ok(total);
        } catch (Exception e) {
            log.error("GET /api/chargers/total - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Available Chargers
    @GetMapping("/available")
    public ResponseEntity<Long> getAvailableChargers() {

        log.info("GET /api/chargers/available - Request received");
        try {
            Long available = chargerService.getAvailableChargers();
            log.info("GET /api/chargers/available - Success, available={}", available);
            return ResponseEntity.ok(available);
        } catch (Exception e) {
            log.error("GET /api/chargers/available - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // AC Chargers
    @GetMapping("/ac")
    public ResponseEntity<Long> getACChargers() {
        log.info("GET /api/chargers/ac - Request received");
        try {
            Long acChargers = chargerService.getACChargers();
            log.info("GET /api/chargers/ac - Success, acChargers={}", acChargers);
            return ResponseEntity.ok(acChargers);
        } catch (Exception e) {
            log.error("GET /api/chargers/ac - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // DC Chargers
    @GetMapping("/dc")
    public ResponseEntity<Long> getDCChargers() {
        log.info("GET /api/chargers/dc - Request received");
        try {
            Long dcChargers = chargerService.getDCChargers();
            log.info("GET /api/chargers/dc - Success, dcChargers={}", dcChargers);
            return ResponseEntity.ok(dcChargers);
        } catch (Exception e) {
            log.error("GET /api/chargers/dc - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/deactivate/{id}")
    public ResponseEntity<String> deactivateCharger(@PathVariable Long id) {
        log.info("PUT /api/chargers/deactivate/{} - Request received", id);
        try {
            chargerService.deactivateCharger(id);
            log.info("PUT /api/chargers/deactivate/{} - Success", id);
            return ResponseEntity.ok("Charger Deactivated");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/chargers/deactivate/{} - Not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/chargers/deactivate/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to deactivate charger");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/reactivate/{id}")
    public ResponseEntity<String> reactivateCharger(@PathVariable Long id) {
        log.info("PUT /api/chargers/reactivate/{} - Request received", id);
        try {
            chargerService.reactivateCharger(id);
            log.info("PUT /api/chargers/reactivate/{} - Success", id);
            return ResponseEntity.ok("Charger Reactivated");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/chargers/reactivate/{} - Not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/chargers/reactivate/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to reactivate charger");
        }
    }

}
