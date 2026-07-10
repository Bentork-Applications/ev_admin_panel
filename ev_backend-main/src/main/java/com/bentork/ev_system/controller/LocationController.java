package com.bentork.ev_system.controller;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.LocationDTO;
import com.bentork.ev_system.mapper.LocationMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Location;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LocationRepository;
import com.bentork.ev_system.service.LocationService;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/location")
public class LocationController {
    private final LocationRepository locationRepository;
    private final AdminRepository adminRepository;
    private final LocationService locationService;

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<?> addLocation(@RequestBody LocationDTO dto, Authentication authentication) {
        String adminEmail = authentication.getName();
        log.info("POST /api/location/add - Creating location, city={}, adminEmail={}",
                dto.getCity(), adminEmail);

        try {
            Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
            if (admin.isEmpty()) {
                log.warn("POST /api/location/add - Admin not found: adminEmail={}", adminEmail);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Collections.singletonMap("error", "Admin not found"));
            }

            Location location = LocationMapper.toEntity(dto, admin.get());
            Location saved = locationRepository.save(location);
            log.info("POST /api/location/add - Success, locationId={}, adminEmail={}",
                    saved.getId(), adminEmail);
            return ResponseEntity.ok(location);
        } catch (Exception e) {
            log.error("POST /api/location/add - Failed, adminEmail={}: {}",
                    adminEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to add location"));
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllLocations() {
        log.info("GET /api/location/all - Request received");

        try {
            List<Location> locations = locationRepository.findAll();
            log.info("GET /api/location/all - Success, returned {} locations", locations.size());
            return ResponseEntity.ok(locations);
        } catch (Exception e) {
            log.error("GET /api/location/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch locations"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLocationById(@PathVariable Long id) {
        log.info("GET /api/location/{} - Request received", id);

        try {
            Optional<Location> location = locationRepository.findById(id);

            if (location.isPresent()) {
                log.info("GET /api/location/{} - Success, city={}",
                        id, location.get().getCity());
                return ResponseEntity.ok(location.get());
            } else {
                log.warn("GET /api/location/{} - Location not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Location not found"));
            }
        } catch (Exception e) {
            log.error("GET /api/location/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to fetch location"));
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody LocationDTO updatedDto,
            Authentication authentication) {
        String adminEmail = authentication.getName();
        log.info("PUT /api/location/update/{} - Updating location, adminEmail={}", id, adminEmail);

        try {
            Optional<Location> optionalLocation = locationRepository.findById(id);
            if (optionalLocation.isEmpty()) {
                log.warn("PUT /api/location/update/{} - Location not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Location not found"));
            }

            Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
            if (admin.isEmpty()) {
                log.warn("PUT /api/location/update/{} - Admin not found: adminEmail={}",
                        id, adminEmail);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Collections.singletonMap("error", "Admin not found"));
            }

            Location updated = LocationMapper.updateEntity(optionalLocation.get(), updatedDto, admin.get());
            locationRepository.save(updated);
            log.info("PUT /api/location/update/{} - Success, adminEmail={}", id, adminEmail);
            return ResponseEntity.ok(Collections.singletonMap("message", "Location Updated"));
        } catch (Exception e) {
            log.error("PUT /api/location/update/{} - Failed, adminEmail={}: {}",
                    id, adminEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to update location"));
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteLocation(@PathVariable Long id) {
        log.info("DELETE /api/location/delete/{} - Request received", id);

        try {
            if (locationRepository.existsById(id)) {
                locationRepository.deleteById(id);
                log.info("DELETE /api/location/delete/{} - Success", id);
                return ResponseEntity.ok(Collections.singletonMap("message", "Location Deleted"));
            } else {
                log.warn("DELETE /api/location/delete/{} - Location not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.singletonMap("error", "Location not found"));
            }
        } catch (Exception e) {
            log.error("DELETE /api/location/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "Failed to delete location"));
        }
    }

    @GetMapping("/all/name")
    public ResponseEntity<?> getAllLocationNames() {
        try {
            log.info("Calling Location service to get all location name and id.");
            List<Map<String, Object>> location = locationService.getAllLocationNames();
            return ResponseEntity.ok(location);
        } catch (Exception e) {
            log.error("Fail to get location name and id: {}", e);
            return ResponseEntity.internalServerError().body("Error Fetching location info");
        }
    }
}
