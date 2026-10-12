
package com.bentork.ev_system.controller;

import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.service.RazorpayService;
import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/razorpay")
public class RazorpayController {
    private final RazorpayService razorpayService;
    private final IWalletTransactionService walletService;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> payload) {
        try {
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            String order = razorpayService.createOrder(amount);
            return ResponseEntity.ok(order);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> payload) {
        try {
            String orderId = payload.get("order_id");
            String paymentId = payload.get("payment_id");
            String signature = payload.get("signature");
            Long userId = Long.parseLong(payload.get("user_id"));

            boolean valid = razorpayService.verifySignature(orderId, paymentId, signature);

            if (!valid) {
                return ResponseEntity.badRequest().body("Invalid signature.");
            }

            // 1️⃣ Fetch amount from Razorpay (in rupees)
            com.razorpay.Order razorOrder = razorpayService.fetchOrder(orderId);
            BigDecimal amount = new BigDecimal(razorOrder.get("amount").toString())
                    .divide(BigDecimal.valueOf(100));

            // 2️⃣ CREDIT WALLET (GST + PST APPLIED HERE)
            walletService.credit(
                    userId,
                    null,
                    amount,
                    "TOPUP" // 🔴 MUST BE "TOPUP"
            );

            // 3️⃣ Fetch UPDATED wallet balance (NET)
            BigDecimal walletBalance = walletService.getBalance(userId);

            return ResponseEntity.ok(Map.of(
                    "message", "Payment successful and wallet updated.",
                    "walletAmount", walletBalance));

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body("Error verifying payment: " + e.getMessage());
        }
    }

}
