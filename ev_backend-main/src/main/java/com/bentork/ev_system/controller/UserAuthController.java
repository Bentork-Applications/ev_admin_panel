package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.GoogleLoginRequest;
import com.bentork.ev_system.dto.request.TruecallerLoginRequest;
import com.bentork.ev_system.dto.request.TruecallerWebhookPayload;
import com.bentork.ev_system.dto.request.UserLoginRequest;
import com.bentork.ev_system.dto.request.UserSignupRequest;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.service.TruecallerAuthService;
import com.bentork.ev_system.service.interfaces.IUserAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
public class UserAuthController {

    private final IUserAuthService userAuthService;
    private final TruecallerAuthService truecallerAuthService;

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody UserSignupRequest request,
                                          HttpServletRequest httpRequest) {
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(userAuthService.register(request, ipAddress));
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody UserLoginRequest request) {
        return ResponseEntity.ok(userAuthService.login(request));
    }

    @PostMapping("/request-otp")
    public ResponseEntity<?> requestOtp(@RequestParam String email) {
        userAuthService.sendOtp(email);
        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestParam String email,
            @RequestParam String otp, @RequestParam String newPassword) {
        userAuthService.resetPassword(email, otp, newPassword);
        return ResponseEntity.ok("Password reset successful.");
    }

    /**
     * POST-based Google login with DPDPA consent support.
     * Consent fields are required only for new users (first-time registration).
     */
    @PostMapping("/google-login")
    public ResponseEntity<?> googleLoginWithConsent(@Valid @RequestBody GoogleLoginRequest request,
                                                    HttpServletRequest httpRequest) {
        String ipAddress = getClientIpAddress(httpRequest);
        return ResponseEntity.ok(userAuthService.googleLoginWithConsent(
                request.getEmail(),
                request.isConsentToTerms(),
                request.isConsentToDataProcessing(),
                ipAddress));
    }

    /**
     * @deprecated Use POST /api/user/google-login instead for DPDPA compliance.
     * Kept for backward compatibility — does not record consent for new users.
     */
    @Deprecated
    @GetMapping("/google-login-success")
    public ResponseEntity<?> googleLoginSuccess(@RequestParam String email) {
        return ResponseEntity.ok(userAuthService.googleLogin(email));
    }

    @PostMapping("/truecaller-login")
    public ResponseEntity<?> truecallerLogin(@Valid @RequestBody TruecallerLoginRequest request) {
        return ResponseEntity.ok(truecallerAuthService.login(request));
    }

    @PostMapping(value = "/truecaller/webhook", 
                 consumes = {MediaType.APPLICATION_JSON_VALUE, 
                            MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                            MediaType.ALL_VALUE})
    public ResponseEntity<?> truecallerWebhook(
        @RequestParam(required = false) String requestId,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String phonenumber,
        @RequestBody(required = false) TruecallerWebhookPayload body,
        HttpServletRequest request
    ) {
        String resolvedRequestId = body != null ? body.getRequestId() : requestId;
        String resolvedStatus = body != null ? body.getStatus() : status;
        String resolvedPhone = body != null ? body.getPhonenumber() : phonenumber;

        log.info("Truecaller webhook hit — contentType: {}, requestId: {}, status: {}",
            request.getContentType(), resolvedRequestId, resolvedStatus);

        TruecallerWebhookPayload payloadToUse = body;
        if (payloadToUse == null) {
            payloadToUse = new TruecallerWebhookPayload();
            payloadToUse.setRequestId(resolvedRequestId);
            payloadToUse.setStatus(resolvedStatus);
            payloadToUse.setPhonenumber(resolvedPhone);
        }

        truecallerAuthService.handleWebhook(payloadToUse);
        return ResponseEntity.ok("Webhook received");
    }

    @GetMapping("/truecaller/status/{requestId}")
    public ResponseEntity<?> getTruecallerStatus(@PathVariable String requestId) {
        return ResponseEntity.ok(truecallerAuthService.getLoginStatus(requestId));
    }

    @DeleteMapping("/delete-account")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails) {
        userAuthService.deleteAccount(userDetails.getUsername());
        return ResponseEntity.ok("Account permanently deleted successfully. All personal data has been erased.");
    }

    @GetMapping("/total")
    public ResponseEntity<Long> getTotalUsers() {
        return ResponseEntity.ok(userAuthService.getTotalUsers());
    }

    @GetMapping("/byemail/{email}")
    public ResponseEntity<User> getUserDetailsByEmail(@PathVariable String email) throws Exception {
        return ResponseEntity.ok(userAuthService.getUserDetailsByEmail(email));
    }

    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userAuthService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) throws Exception {
        return ResponseEntity.ok(userAuthService.getUserById(id));
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/deactivate/{id}")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        try {
            userAuthService.deactivateUser(id);
            return ResponseEntity.ok("User deactivated successfully.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/reactivate/{id}")
    public ResponseEntity<?> reactivateUser(@PathVariable Long id) {
        try {
            userAuthService.reactivateUser(id);
            return ResponseEntity.ok("User reactivated successfully.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    /**
     * Extracts the client IP address, considering X-Forwarded-For header for proxied requests.
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}