package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.RedeemRequest;
import com.bentork.ev_system.dto.response.CoinBalanceResponse;
import com.bentork.ev_system.model.CoinTransaction;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.ICoinService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/coins")
public class CoinController {
    private final ICoinService coinService;
        private final UserRepository userRepository;

    /**
     * Get user's coin balance and redeemable kWh.
     */
    @GetMapping("/balance")
    public ResponseEntity<?> getCoinBalance(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/coins/balance - Request received");

        try {
            User user = extractUser(userDetails);
            CoinBalanceResponse response = coinService.getCoinBalance(user.getId());

            log.info("GET /api/coins/balance - Success, userId={}, balance={}, redeemableKwh={}",
                    user.getId(), response.getCoinBalance(), response.getRedeemableKwh());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("GET /api/coins/balance - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get coin transaction history.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getCoinHistory(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/coins/history - Request received");

        try {
            User user = extractUser(userDetails);
            List<CoinTransaction> history = coinService.getCoinTransactionHistory(user.getId());

            log.info("GET /api/coins/history - Success, userId={}, transactions={}",
                    user.getId(), history.size());

            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("GET /api/coins/history - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Redeem coins for wallet credit.
     * 1000 coins = 1 kWh. Credits ₹ equivalent to wallet.
     * Uses a default rate of ₹12/kWh for redemption.
     */
    @PostMapping("/redeem")
    public ResponseEntity<?> redeemCoins(
            @Valid @RequestBody RedeemRequest request,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("POST /api/coins/redeem - Request received, coins={}", request.getCoins());

        try {
            User user = extractUser(userDetails);

            // Default rate for coin redemption (₹18 per kWh)
            // You can make this configurable via application.properties
            double defaultRate = 18.0;

            double kwhRedeemed = coinService.redeemCoins(user.getId(), request.getCoins(), defaultRate);

            log.info("POST /api/coins/redeem - Success, userId={}, coins={}, kwhRedeemed={}",
                    user.getId(), request.getCoins(), kwhRedeemed);

            return ResponseEntity.ok(Map.of(
                    "message", "Successfully redeemed " + request.getCoins() + " coins",
                    "kwhRedeemed", kwhRedeemed,
                    "coinsUsed", request.getCoins(),
                    "remainingBalance", coinService.getCoinBalance(user.getId()).getCoinBalance()));

        } catch (RuntimeException e) {
            log.error("POST /api/coins/redeem - Failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/coins/redeem - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to redeem coins"));
        }
    }

    private User extractUser(org.springframework.security.core.userdetails.UserDetails userDetails) { return userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new RuntimeException("User not found")); }
}
