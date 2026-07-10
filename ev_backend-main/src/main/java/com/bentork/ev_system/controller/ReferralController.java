package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.ApplyReferralRequest;
import com.bentork.ev_system.dto.response.ReferralInfoResponse;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.ReferralService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/referral")
public class ReferralController {
    private final ReferralService referralService;
        private final UserRepository userRepository;

    /**
     * Get or generate the user's referral code.
     */
    @GetMapping("/code")
    public ResponseEntity<?> getReferralCode(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/referral/code - Request received");

        try {
            User user = extractUser(userDetails);
            String code = referralService.getOrGenerateReferralCode(user.getId());

            log.info("GET /api/referral/code - Success, userId={}, code={}", user.getId(), code);

            return ResponseEntity.ok(Map.of("referralCode", code));
        } catch (Exception e) {
            log.error("GET /api/referral/code - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get referral stats (total, completed, pending referrals).
     */
    @GetMapping("/info")
    public ResponseEntity<?> getReferralInfo(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/referral/info - Request received");

        try {
            User user = extractUser(userDetails);
            ReferralInfoResponse info = referralService.getReferralInfo(user.getId());

            log.info("GET /api/referral/info - Success, userId={}, total={}, completed={}",
                    user.getId(), info.getTotalReferrals(), info.getCompletedReferrals());

            return ResponseEntity.ok(info);
        } catch (Exception e) {
            log.error("GET /api/referral/info - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Apply a friend's referral code (from wallet section).
     * Creates a PENDING referral record.
     * Bonuses are awarded when the user completes their first charging session.
     */
    @PostMapping("/apply")
    public ResponseEntity<?> applyReferralCode(
            @Valid @RequestBody ApplyReferralRequest request,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("POST /api/referral/apply - Request received, code={}", request.getReferralCode());

        try {
            User user = extractUser(userDetails);
            referralService.applyReferralCode(user.getId(), request.getReferralCode());

            log.info("POST /api/referral/apply - Success, userId={}, code={}",
                    user.getId(), request.getReferralCode());

            return ResponseEntity.ok(Map.of(
                    "message",
                    "Referral code applied successfully! Complete your first charging session to earn 50 bonus coins."));

        } catch (RuntimeException e) {
            log.error("POST /api/referral/apply - Failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/referral/apply - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to apply referral code"));
        }
    }

    private User extractUser(org.springframework.security.core.userdetails.UserDetails userDetails) { return userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new RuntimeException("User not found")); }
}
