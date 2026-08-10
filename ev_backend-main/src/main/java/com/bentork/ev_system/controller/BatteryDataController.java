package com.bentork.ev_system.controller;

import com.bentork.ev_system.util.PiiMaskingUtil;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import com.bentork.ev_system.dto.request.BatteryDataDTO;
import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.dto.response.BatteryExcelUploadResponse;
import com.bentork.ev_system.service.BatteryDataService;
import com.bentork.ev_system.service.BatteryExcelService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/battery-data")
@RequiredArgsConstructor
@Slf4j
public class BatteryDataController {

    private final BatteryDataService batteryDataService;
    private final BatteryExcelService batteryExcelService;

    // ==================== ADMIN/STAFF ENDPOINTS ====================

    /**
     * Register battery data (single or series expansion).
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @PostMapping("/admin/register")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> registerBattery(@Valid @RequestBody BatteryDataDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} registering battery data", PiiMaskingUtil.maskEmail(adminEmail));
        try {
            List<BatteryDataResponse> responses = batteryDataService.registerBattery(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(responses);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Register batteries from uploaded Excel file.
     * Accessible by ADMIN and ADMIN_STAFF.
     *
     * Expected Excel columns: customerName, productDetails, invoiceNumber,
     * barcode, warrantyStartDate (yyyy-MM-dd), warrantyEndDate (yyyy-MM-dd),
     * address (optional)
     */
    @PostMapping(value = "/admin/register/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<BatteryExcelUploadResponse> registerBatteriesFromExcel(
            @RequestParam("file") MultipartFile file) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} uploading Excel file for battery registration: {}",
                PiiMaskingUtil.maskEmail(adminEmail), file.getOriginalFilename());
        BatteryExcelUploadResponse response = batteryExcelService.registerBatteriesFromExcel(file, adminEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
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

    /**
     * Search batteries by invoice number. Used by mobile app users.
     * Only returns results if the invoice belongs to the requesting user's order.
     */
    @GetMapping("/user/search")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> searchByInvoice(@RequestParam String invoice) {
        String userEmail = getCurrentUserEmail();
        log.info("User {} searching battery data by invoice: {}", PiiMaskingUtil.maskEmail(userEmail), invoice);
        try {
            return ResponseEntity.ok(batteryDataService.searchByInvoice(invoice, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
