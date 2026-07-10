package com.bentork.ev_system.controller;

import java.util.List;
import java.util.Map;

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
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.SupportRequestDTO;
import com.bentork.ev_system.dto.response.SupportRequestResponse;
import com.bentork.ev_system.service.DealerSupportRequestService;
import com.bentork.ev_system.service.SupportRequestAdminService;
import com.bentork.ev_system.service.UserSupportRequestService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/support-requests")
@RequiredArgsConstructor
@Slf4j
public class SupportRequestController {

    private final UserSupportRequestService userSupportRequestService;
    private final DealerSupportRequestService dealerSupportRequestService;
    private final SupportRequestAdminService supportRequestAdminService;

    // ==================== USER ENDPOINTS ====================

    /**
     * End-user submits a support request → saved to user_support_requests table.
     * POST /api/support-requests/user
     */
    @PostMapping("/user")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<SupportRequestResponse> createRequestAsUser(@RequestBody SupportRequestDTO requestDTO) {
        String email = getCurrentUserEmail();
        log.info("User {} submitting support request", email);
        SupportRequestResponse response = userSupportRequestService.createRequest(requestDTO, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * End-user views their own support requests.
     * GET /api/support-requests/user/my-requests
     */
    @GetMapping("/user/my-requests")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<SupportRequestResponse>> getUserRequests() {
        String email = getCurrentUserEmail();
        log.info("Fetching support requests for user {}", email);
        return ResponseEntity.ok(userSupportRequestService.getMyRequests(email));
    }

    // ==================== DEALER ENDPOINTS ====================

    /**
     * Dealer submits a support request → saved to dealer_support_requests table.
     * POST /api/support-requests/dealer
     */
    @PostMapping("/dealer")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<SupportRequestResponse> createRequestAsDealer(@RequestBody SupportRequestDTO requestDTO) {
        String email = getCurrentUserEmail();
        log.info("Dealer {} submitting support request", email);
        SupportRequestResponse response = dealerSupportRequestService.createRequest(requestDTO, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Dealer views their own support requests.
     * GET /api/support-requests/dealer/my-requests
     */
    @GetMapping("/dealer/my-requests")
    @PreAuthorize("hasAuthority('DEALER')")
    public ResponseEntity<List<SupportRequestResponse>> getDealerRequests() {
        String email = getCurrentUserEmail();
        log.info("Fetching support requests for dealer {}", email);
        return ResponseEntity.ok(dealerSupportRequestService.getMyRequests(email));
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Admin views all support requests (merged from both tables).
     * GET /api/support-requests/admin/all
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<SupportRequestResponse>> getAllRequests() {
        log.info("Admin fetching all support requests");
        return ResponseEntity.ok(supportRequestAdminService.getAllRequests());
    }

    /**
     * Admin filters support requests by status (merged from both tables).
     * GET /api/support-requests/admin/status/{status}
     */
    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<SupportRequestResponse>> getRequestsByStatus(@PathVariable String status) {
        log.info("Admin fetching support requests by status: {}", status);
        return ResponseEntity.ok(supportRequestAdminService.getRequestsByStatus(status));
    }

    /**
     * Admin filters support requests by customer type (END_USER or DEALER).
     * GET /api/support-requests/admin/customer-type/{type}
     */
    @GetMapping("/admin/customer-type/{type}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<SupportRequestResponse>> getRequestsByCustomerType(@PathVariable String type) {
        log.info("Admin fetching support requests by customer type: {}", type);
        return ResponseEntity.ok(supportRequestAdminService.getRequestsByCustomerType(type));
    }

    /**
     * Admin updates a USER support request's status.
     * PUT /api/support-requests/admin/user/{id}/status
     */
    @PutMapping("/admin/user/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> updateUserRequestStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        log.info("Admin updating user support request {} status to {}", id, status);
        try {
            SupportRequestResponse response = supportRequestAdminService.updateUserRequestStatus(id, status);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update user support request status", e);
            return ResponseEntity.internalServerError().body("Failed to update status");
        }
    }

    /**
     * Admin updates a DEALER support request's status.
     * PUT /api/support-requests/admin/dealer/{id}/status
     */
    @PutMapping("/admin/dealer/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> updateDealerRequestStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        log.info("Admin updating dealer support request {} status to {}", id, status);
        try {
            SupportRequestResponse response = supportRequestAdminService.updateDealerRequestStatus(id, status);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update dealer support request status", e);
            return ResponseEntity.internalServerError().body("Failed to update status");
        }
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
