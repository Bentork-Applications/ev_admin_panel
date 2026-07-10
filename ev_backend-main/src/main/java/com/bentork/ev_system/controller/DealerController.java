package com.bentork.ev_system.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.dto.response.RevenueDTO;
import com.bentork.ev_system.dto.response.SessionDTO;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.service.DealerDataService;
import com.bentork.ev_system.service.strategy.StationAccessStrategy;
import com.bentork.ev_system.service.strategy.StationAccessStrategyFactory;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Controller for dealer-specific operations.
 * Dealers can only access their assigned stations' data.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dealer")
@Slf4j
public class DealerController {
    private final StationAccessStrategyFactory strategyFactory;
    private final DealerDataService dealerDataService;

    // ==================== STATION ENDPOINTS ====================

    /**
     * Get all stations assigned to the current dealer
     * GET /api/dealer/stations
     */
    @GetMapping("/stations")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<List<StationDTO>> getMyStations() {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching their assigned stations", email);

        StationAccessStrategy strategy = strategyFactory.getStrategy("DEALER");
        List<StationDTO> stations = strategy.getAccessibleStations(email);

        return ResponseEntity.ok(stations);
    }

    /**
     * Get a specific station's details (only if assigned to this dealer)
     * GET /api/dealer/stations/{id}
     */
    @GetMapping("/stations/{id}")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<?> getStationById(@PathVariable Long id) {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching station {}", email, id);

        StationAccessStrategy strategy = strategyFactory.getStrategy("DEALER");

        if (!strategy.hasAccessToStation(email, id)) {
            log.warn("Dealer {} attempted to access unauthorized station {}", email, id);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You do not have access to this station");
        }

        List<StationDTO> stations = strategy.getAccessibleStations(email);
        StationDTO station = stations.stream()
                .filter(s -> s.getId().equals(id))
                .findFirst()
                .orElse(null);

        if (station == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(station);
    }

    /**
     * Get count of stations assigned to the current dealer
     * GET /api/dealer/stations/count
     */
    @GetMapping("/stations/count")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<Long> getMyStationsCount() {
        String email = getCurrentUserEmail();
        StationAccessStrategy strategy = strategyFactory.getStrategy("DEALER");
        return ResponseEntity.ok(strategy.getAccessibleStationsCount(email));
    }

    // ==================== SESSION ENDPOINTS ====================

    /**
     * Get all sessions from dealer's assigned stations
     * GET /api/dealer/sessions
     */
    @GetMapping("/sessions")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<List<SessionDTO>> getAllSessions() {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching all sessions", email);
        return ResponseEntity.ok(dealerDataService.getAllSessions(email));
    }

    /**
     * Get sessions for a specific station
     * GET /api/dealer/sessions/station/{stationId}
     */
    @GetMapping("/sessions/station/{stationId}")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<?> getSessionsByStation(@PathVariable Long stationId) {
        String email = getCurrentUserEmail();
        try {
            List<SessionDTO> sessions = dealerDataService.getSessionsByStation(email, stationId);
            return ResponseEntity.ok(sessions);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    /**
     * Get total session count for dealer's stations
     * GET /api/dealer/sessions/count
     */
    @GetMapping("/sessions/count")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<Long> getSessionCount() {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(dealerDataService.getTotalSessionCount(email));
    }

    // ==================== REVENUE ENDPOINTS ====================

    /**
     * Get all revenue from dealer's assigned stations
     * GET /api/dealer/revenue
     */
    @GetMapping("/revenue")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<List<RevenueDTO>> getAllRevenue() {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching all revenue", email);
        return ResponseEntity.ok(dealerDataService.getAllRevenue(email));
    }

    /**
     * Get revenue for a specific station
     * GET /api/dealer/revenue/station/{stationId}
     */
    @GetMapping("/revenue/station/{stationId}")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<?> getRevenueByStation(@PathVariable Long stationId) {
        String email = getCurrentUserEmail();
        try {
            List<RevenueDTO> revenue = dealerDataService.getRevenueByStation(email, stationId);
            return ResponseEntity.ok(revenue);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    /**
     * Get total revenue amount for dealer's stations
     * GET /api/dealer/revenue/total
     */
    @GetMapping("/revenue/total")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<Map<String, Object>> getTotalRevenue() {
        String email = getCurrentUserEmail();
        Double total = dealerDataService.getTotalRevenueAmount(email);

        Map<String, Object> response = new HashMap<>();
        response.put("totalRevenue", total);
        response.put("dealerEmail", email);

        return ResponseEntity.ok(response);
    }

    /**
     * Get revenue amount for a specific station
     * GET /api/dealer/revenue/station/{stationId}/total
     */
    @GetMapping("/revenue/station/{stationId}/total")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<?> getStationRevenue(@PathVariable Long stationId) {
        String email = getCurrentUserEmail();
        try {
            Double total = dealerDataService.getRevenueAmountByStation(email, stationId);

            Map<String, Object> response = new HashMap<>();
            response.put("stationId", stationId);
            response.put("totalRevenue", total);

            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // ==================== CHARGER ENDPOINTS ====================

    /**
     * Get all chargers from dealer's assigned stations
     * GET /api/dealer/chargers
     */
    @GetMapping("/chargers")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<List<Charger>> getAllChargers() {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching all chargers", email);
        return ResponseEntity.ok(dealerDataService.getAllChargers(email));
    }

    /**
     * Get chargers for a specific station
     * GET /api/dealer/chargers/station/{stationId}
     */
    @GetMapping("/chargers/station/{stationId}")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<?> getChargersByStation(@PathVariable Long stationId) {
        String email = getCurrentUserEmail();
        try {
            List<Charger> chargers = dealerDataService.getChargersByStation(email, stationId);
            return ResponseEntity.ok(chargers);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // ==================== DASHBOARD SUMMARY ====================

    /**
     * Get dealer dashboard summary
     * GET /api/dealer/dashboard
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        String email = getCurrentUserEmail();
        log.info("Dealer {} fetching dashboard summary", email);

        StationAccessStrategy strategy = strategyFactory.getStrategy("DEALER");

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalStations", strategy.getAccessibleStationsCount(email));
        dashboard.put("totalSessions", dealerDataService.getTotalSessionCount(email));
        dashboard.put("totalRevenue", dealerDataService.getTotalRevenueAmount(email));
        dashboard.put("totalChargers", dealerDataService.getAllChargers(email).size());

        return ResponseEntity.ok(dashboard);
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
