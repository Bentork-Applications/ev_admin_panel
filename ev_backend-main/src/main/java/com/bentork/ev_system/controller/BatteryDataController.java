package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.BatteryDataDTO;
import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.service.BatteryDataService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/battery-data")
@RequiredArgsConstructor
@Slf4j
public class BatteryDataController {

    private final BatteryDataService batteryDataService;

    // ==================== ADMIN/STAFF ENDPOINTS ====================

    /**
     * Register battery data (single or series expansion).
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @PostMapping("/admin/register")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> registerBattery(@RequestBody BatteryDataDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} registering battery data", adminEmail);
        try {
            List<BatteryDataResponse> responses = batteryDataService.registerBattery(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(responses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all battery data. Accessible by ADMIN and ADMIN_STAFF.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<List<BatteryDataResponse>> getAllBatteries() {
        log.info("Admin/Staff fetching all battery data");
        return ResponseEntity.ok(batteryDataService.getAllBatteries());
    }

    /**
     * Get a single battery by ID. Accessible by ADMIN and ADMIN_STAFF.
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> getBatteryById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(batteryDataService.getBatteryById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // ==================== USER ENDPOINTS ====================

    /**
     * Search batteries by invoice number. Used by mobile app users.
     */
    @GetMapping("/user/search")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<BatteryDataResponse>> searchByInvoice(@RequestParam String invoice) {
        log.info("User searching battery data by invoice: {}", invoice);
        return ResponseEntity.ok(batteryDataService.searchByInvoice(invoice));
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
