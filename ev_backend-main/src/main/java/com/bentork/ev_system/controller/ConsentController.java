package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.ConsentWithdrawRequest;
import com.bentork.ev_system.dto.response.ConsentStatusResponse;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserConsent;
import com.bentork.ev_system.model.enums.ConsentType;
import com.bentork.ev_system.service.ConsentService;
import com.bentork.ev_system.service.interfaces.IUserAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST controller for managing user consent under DPDPA.
 * All endpoints require authentication.
 */
@RestController
@RequestMapping("/api/user/consent")
@RequiredArgsConstructor
@Slf4j
public class ConsentController {

    private final ConsentService consentService;
    private final IUserAuthService userAuthService;

    /**
     * Get all consent statuses for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<ConsentStatusResponse>> getConsentStatuses(
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            List<UserConsent> consents = consentService.getUserConsents(user);

            List<ConsentStatusResponse> response = consents.stream()
                    .map(c -> ConsentStatusResponse.builder()
                            .consentType(c.getConsentType())
                            .granted(c.getGranted())
                            .grantedAt(c.getGrantedAt())
                            .withdrawnAt(c.getWithdrawnAt())
                            .version(c.getVersion())
                            .build())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to fetch consent statuses: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Withdraw a specific consent type (DPDPA Section 6 — right to withdraw).
     */
    @PostMapping("/withdraw")
    public ResponseEntity<?> withdrawConsent(
            @Valid @RequestBody ConsentWithdrawRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            consentService.withdrawConsent(user, request.getConsentType());
            log.info("Consent {} withdrawn for user {}", request.getConsentType(), userDetails.getUsername());
            return ResponseEntity.ok("Consent withdrawn successfully for: " + request.getConsentType());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to withdraw consent: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to withdraw consent.");
        }
    }

    /**
     * Re-grant a previously withdrawn consent.
     */
    @PostMapping("/grant")
    public ResponseEntity<?> grantConsent(
            @Valid @RequestBody ConsentWithdrawRequest request,
            @AuthenticationPrincipal UserDetails userDetails,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            String ipAddress = getClientIpAddress(httpRequest);
            consentService.grantConsent(user, request.getConsentType(), ipAddress);
            log.info("Consent {} granted for user {}", request.getConsentType(), userDetails.getUsername());
            return ResponseEntity.ok("Consent granted successfully for: " + request.getConsentType());
        } catch (Exception e) {
            log.error("Failed to grant consent: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to grant consent.");
        }
    }

    private String getClientIpAddress(jakarta.servlet.http.HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
