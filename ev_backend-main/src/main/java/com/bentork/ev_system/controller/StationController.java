package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.service.StationService;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stations")
@Slf4j
public class StationController {
    private final StationService stationService;

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<String> createStation(@RequestBody StationDTO dto) {
        log.info("POST /api/stations/add - Creating station, name={}, locationId={}",
                dto.getName(), dto.getLocationId());

        try {
            StationDTO created = stationService.createStation(dto);
            log.info("POST /api/stations/add - Success, stationId={}", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body("Station Created");
        } catch (EntityNotFoundException e) {
            log.error("POST /api/stations/add - Location not found: locationId={}",
                    dto.getLocationId());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("POST /api/stations/add - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to create station");
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<StationDTO>> getAllStations() {
        log.info("GET /api/stations/all - Request received");

        try {
            List<StationDTO> stations = stationService.getAllStations();
            log.info("GET /api/stations/all - Success, returned {} stations", stations.size());
            return ResponseEntity.ok(stations);
        } catch (Exception e) {
            log.error("GET /api/stations/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<StationDTO> getStationById(@PathVariable Long id) {
        log.info("GET /api/stations/{} - Request received", id);

        try {
            StationDTO station = stationService.getStationById(id);
            log.info("GET /api/stations/{} - Success, name={}", id, station.getName());
            return ResponseEntity.ok(station);
        } catch (EntityNotFoundException e) {
            log.warn("GET /api/stations/{} - Station not found", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("GET /api/stations/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<String> updateStation(@PathVariable Long id, @RequestBody StationDTO dto) {
        log.info("PUT /api/stations/update/{} - Updating station, name={}, status={}",
                id, dto.getName(), dto.getStatus());

        try {
            stationService.updateStation(id, dto);
            log.info("PUT /api/stations/update/{} - Success", id);
            return ResponseEntity.ok("Station Updated");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/stations/update/{} - Not found: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/stations/update/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update station");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteStation(@PathVariable Long id) {
        log.info("DELETE /api/stations/delete/{} - Request received", id);

        try {
            stationService.deleteStation(id);
            log.info("DELETE /api/stations/delete/{} - Success (deactivated)", id);
            return ResponseEntity.ok("Station Deactivated");
        } catch (EntityNotFoundException e) {
            log.warn("DELETE /api/stations/delete/{} - Station not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("DELETE /api/stations/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to deactivate station");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/deactivate/{id}")
    public ResponseEntity<String> deactivateStation(@PathVariable Long id) {
        log.info("PUT /api/stations/deactivate/{} - Request received", id);

        try {
            stationService.deactivateStation(id);
            log.info("PUT /api/stations/deactivate/{} - Success", id);
            return ResponseEntity.ok("Station Deactivated (chargers cascaded)");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/stations/deactivate/{} - Station not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/stations/deactivate/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to deactivate station");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/reactivate/{id}")
    public ResponseEntity<String> reactivateStation(@PathVariable Long id) {
        log.info("PUT /api/stations/reactivate/{} - Request received", id);

        try {
            stationService.reactivateStation(id);
            log.info("PUT /api/stations/reactivate/{} - Success", id);
            return ResponseEntity.ok("Station Reactivated");
        } catch (EntityNotFoundException e) {
            log.warn("PUT /api/stations/reactivate/{} - Station not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/stations/reactivate/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to reactivate station");
        }
    }

    @GetMapping("/total")
    public ResponseEntity<Long> getTotalStations() {
        log.info("GET /api/stations/total - Request received");

        try {
            Long total = stationService.getTotalStations();
            log.info("GET /api/stations/total - Success, total={}", total);
            return ResponseEntity.ok(total);
        } catch (Exception e) {
            log.error("GET /api/stations/total - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/active")
    public ResponseEntity<Long> getActiveStations() {
        log.info("GET /api/stations/active - Request received");

        try {
            Long active = stationService.getActiveStations();
            log.info("GET /api/stations/active - Success, active={}", active);
            return ResponseEntity.ok(active);
        } catch (Exception e) {
            log.error("GET /api/stations/active - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/uptime")
    public ResponseEntity<Double> getAverageUptime() {
        log.info("GET /api/stations/uptime - Request received");

        try {
            Double uptime = stationService.getAverageUptime();
            log.info("GET /api/stations/uptime - Success, uptime={}%", uptime);
            return ResponseEntity.ok(uptime);
        } catch (Exception e) {
            log.error("GET /api/stations/uptime - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ERROR TODAY
    @GetMapping("/error/today")
    public ResponseEntity<Long> getTodaysError() {
        try {
            log.info("Calling station service to get todays total errors");
            Long count = stationService.getTodaysErrorCount();
            return ResponseEntity.ok(count);
        } catch (DataAccessException e) {
            log.error("Error while accessing data: {}", e);
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            log.error("Global error: {}", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}