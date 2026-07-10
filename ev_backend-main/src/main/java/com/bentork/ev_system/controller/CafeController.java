package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.CafeRequestDTO;
import com.bentork.ev_system.dto.response.CafeResponseDTO;
import com.bentork.ev_system.service.CafeService;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.EntityNotFoundException;

import java.util.Collections;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cafes")
public class CafeController {
    private final CafeService cafeService;

    /**
     * Fetch nearby cafes. Admin-added cafes within the radius are prioritized
     * and placed at the top of the list, followed by Google Places results.
     */
    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyCafes(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "1500") double radius) {

        log.info("GET /api/cafes/nearby - lat={}, lng={}, radius={}m", latitude, longitude, radius);

        try {
            if (radius <= 0 || radius > 50000) {
                log.warn("GET /api/cafes/nearby - Invalid radius: {}", radius);
                return ResponseEntity.badRequest()
                        .body(Collections.singletonMap("error", "Radius must be between 1 and 50000 meters"));
            }

            List<CafeResponseDTO> cafes = cafeService.getNearbyCafesWithPriority(latitude, longitude, radius);
            log.info("GET /api/cafes/nearby - Success, returned {} total cafes", cafes.size());
            return ResponseEntity.ok(cafes);

        } catch (Exception e) {
            log.error("GET /api/cafes/nearby - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch nearby cafes"));
        }
    }

    /**
     * Admin: Create a new cafe
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<?> createCafe(@RequestBody CafeRequestDTO dto) {
        log.info("POST /api/cafes/add - Creating cafe: {}", dto.getName());
        try {
            CafeResponseDTO created = cafeService.createCafe(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/cafes/add - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to create cafe"));
        }
    }

    /**
     * Admin: Update an existing cafe
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateCafe(@PathVariable Long id, @RequestBody CafeRequestDTO dto) {
        log.info("PUT /api/cafes/update/{} - Updating cafe", id);
        try {
            CafeResponseDTO updated = cafeService.updateCafe(id, dto);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            log.error("PUT /api/cafes/update/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to update cafe"));
        }
    }

    /**
     * Admin: Delete a cafe
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteCafe(@PathVariable Long id) {
        log.info("DELETE /api/cafes/delete/{} - Deleting cafe", id);
        try {
            cafeService.deleteCafe(id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Cafe deleted successfully"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            log.error("DELETE /api/cafes/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to delete cafe"));
        }
    }

    /**
     * Get a specific admin cafe by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getCafeById(@PathVariable Long id) {
        try {
            CafeResponseDTO cafe = cafeService.getCafeById(id);
            return ResponseEntity.ok(cafe);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GET /api/cafes/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch cafe"));
        }
    }

    /**
     * Get all admin cafes for a specific station
     */
    @GetMapping("/station/{stationId}")
    public ResponseEntity<?> getCafesByStationId(@PathVariable Long stationId) {
        try {
            List<CafeResponseDTO> cafes = cafeService.getCafesByStationId(stationId);
            return ResponseEntity.ok(cafes);
        } catch (Exception e) {
            log.error("GET /api/cafes/station/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch cafes for station"));
        }
    }

    /**
     * Admin: Get all admin-added cafes
     */
    @PreAuthorize("hasAuthority('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<?> getAllCafes() {
        try {
            List<CafeResponseDTO> cafes = cafeService.getAllCafes();
            return ResponseEntity.ok(cafes);
        } catch (Exception e) {
            log.error("GET /api/cafes/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch all cafes"));
        }
    }
}
