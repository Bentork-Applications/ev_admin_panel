package com.bentork.ev_system.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.ClaimRejectDTO;
import com.bentork.ev_system.dto.request.DispatchDetailsDTO;
import com.bentork.ev_system.dto.request.WarrantyClaimDTO;
import com.bentork.ev_system.dto.response.AverageProcessingTimeResponse;
import com.bentork.ev_system.dto.response.WarrantyClaimResponse;
import com.bentork.ev_system.service.WarrantyClaimService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/warranty-claims")
@RequiredArgsConstructor
@Slf4j
public class WarrantyClaimController {

    private final WarrantyClaimService warrantyClaimService;

    // ==================== USER (MOBILE APP) ENDPOINTS ====================

    /**
     * Submit a warranty claim.
     */
    @PostMapping("/user/create")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> createClaim(@RequestBody WarrantyClaimDTO dto) {
        String userEmail = getCurrentUserEmail();
        log.info("User {} creating warranty claim", userEmail);
        try {
            WarrantyClaimResponse response = warrantyClaimService.createClaim(dto, userEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * List user's own warranty claims.
     */
    @GetMapping("/user/my-claims")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<WarrantyClaimResponse>> getUserClaims() {
        String userEmail = getCurrentUserEmail();
        log.info("Fetching warranty claims for user {}", userEmail);
        return ResponseEntity.ok(warrantyClaimService.getUserClaims(userEmail));
    }

    /**
     * View a specific claim detail (user must own the claim).
     */
    @GetMapping("/user/{id}")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> getUserClaimDetail(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(warrantyClaimService.getUserClaimDetail(id, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * User confirms receipt of the repaired product.
     */
    @PutMapping("/user/{id}/confirm-received")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> confirmReceived(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        log.info("User {} confirming receipt for claim {}", userEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.userConfirmReceived(id, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== ADMIN/STAFF ENDPOINTS ====================

    /**
     * Get all warranty claims. Accessible by ADMIN and ADMIN_STAFF.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<List<WarrantyClaimResponse>> getAllClaims() {
        log.info("Admin/Staff fetching all warranty claims");
        return ResponseEntity.ok(warrantyClaimService.getAllClaims());
    }

    /**
     * Get average processing time across completed warranty claims.
     * Supports optional date-range filtering via 'from' and 'to' query params (ISO format: yyyy-MM-dd'T'HH:mm:ss).
     */
    @GetMapping("/admin/average-processing-time")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<AverageProcessingTimeResponse> getAverageProcessingTime(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        log.info("Admin fetching average warranty processing time (from={}, to={})", from, to);

        LocalDateTime fromDate = null;
        LocalDateTime toDate = null;

        if (from != null && !from.isEmpty()) {
            fromDate = LocalDateTime.parse(from, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
        if (to != null && !to.isEmpty()) {
            toDate = LocalDateTime.parse(to, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }

        return ResponseEntity.ok(warrantyClaimService.getAverageProcessingTime(fromDate, toDate));
    }

    /**
     * Filter warranty claims by status.
     */
    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<List<WarrantyClaimResponse>> getClaimsByStatus(@PathVariable String status) {
        log.info("Admin/Staff fetching warranty claims by status: {}", status);
        return ResponseEntity.ok(warrantyClaimService.getClaimsByStatus(status));
    }

    /**
     * Get a specific claim detail with full timeline (admin view).
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> getClaimDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(warrantyClaimService.getClaimDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Approve a warranty claim.
     */
    @PutMapping("/admin/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> approveClaim(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} approving claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.approveClaim(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Reject a warranty claim with a reason.
     */
    @PutMapping("/admin/{id}/reject")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> rejectClaim(@PathVariable Long id, @RequestBody ClaimRejectDTO rejectDTO) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} rejecting claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.rejectClaim(id, rejectDTO, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Mark product as received at service center.
     */
    @PutMapping("/admin/{id}/receive-product")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> receiveProduct(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} marking product received for claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.receiveProduct(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Start processing the battery.
     */
    @PutMapping("/admin/{id}/start-processing")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> startProcessing(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} starting processing for claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.startProcessing(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Mark processing as complete.
     */
    @PutMapping("/admin/{id}/complete")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> completeProcessing(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} completing processing for claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.completeProcessing(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Dispatch the repaired product with courier details.
     */
    @PutMapping("/admin/{id}/dispatch")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> dispatchProduct(@PathVariable Long id, @RequestBody DispatchDetailsDTO dispatchDTO) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} dispatching product for claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.dispatchProduct(id, dispatchDTO, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Mark the product as delivered.
     */
    @PutMapping("/admin/{id}/mark-delivered")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> markDelivered(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} marking delivered for claim {}", adminEmail, id);
        try {
            return ResponseEntity.ok(warrantyClaimService.markDelivered(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
