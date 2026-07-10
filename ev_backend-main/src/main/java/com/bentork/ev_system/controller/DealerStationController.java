package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.AssignStationRequest;
import com.bentork.ev_system.dto.request.DealerStationDTO;
import com.bentork.ev_system.service.DealerStationService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Controller for managing dealer-station assignments.
 * All endpoints are restricted to ADMIN role only.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dealer-stations")
@Slf4j
public class DealerStationController {
    private final DealerStationService dealerStationService;

    /**
     * Assign stations to a dealer
     * POST /api/dealer-stations/assign
     */
    @PostMapping("/assign")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<DealerStationDTO>> assignStationsToDealer(
            @Valid @RequestBody AssignStationRequest request) {
        log.info("Admin assigning stations {} to dealer {}", request.getStationIds(), request.getDealerId());
        List<DealerStationDTO> assignments = dealerStationService.assignStationsToDealer(
                request.getDealerId(), request.getStationIds());
        return ResponseEntity.ok(assignments);
    }

    /**
     * Remove a station from a dealer
     * DELETE /api/dealer-stations/{dealerId}/{stationId}
     */
    @DeleteMapping("/{dealerId}/{stationId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<String> removeStationFromDealer(
            @PathVariable Long dealerId,
            @PathVariable Long stationId) {
        log.info("Admin removing station {} from dealer {}", stationId, dealerId);
        dealerStationService.removeStationFromDealer(dealerId, stationId);
        return ResponseEntity.ok("Station removed from dealer successfully");
    }

    /**
     * Get all stations assigned to a dealer
     * GET /api/dealer-stations/dealer/{dealerId}
     */
    @GetMapping("/dealer/{dealerId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<DealerStationDTO>> getDealerStations(@PathVariable Long dealerId) {
        log.debug("Getting stations for dealer {}", dealerId);
        List<DealerStationDTO> stations = dealerStationService.getDealerStations(dealerId);
        return ResponseEntity.ok(stations);
    }

    /**
     * Get all dealers assigned to a station
     * GET /api/dealer-stations/station/{stationId}
     */
    @GetMapping("/station/{stationId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<DealerStationDTO>> getStationDealers(@PathVariable Long stationId) {
        log.debug("Getting dealers for station {}", stationId);
        List<DealerStationDTO> dealers = dealerStationService.getStationDealers(stationId);
        return ResponseEntity.ok(dealers);
    }

    /**
     * Get all dealer-station assignments
     * GET /api/dealer-stations
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<DealerStationDTO>> getAllAssignments() {
        log.debug("Getting all dealer-station assignments");
        List<DealerStationDTO> assignments = dealerStationService.getAllAssignments();
        return ResponseEntity.ok(assignments);
    }
}
