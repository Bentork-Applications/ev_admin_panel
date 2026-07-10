package com.bentork.ev_system.util;

import io.github.cdimascio.dotenv.Dotenv;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.codec.binary.Hex;

public class RazorpaySignatureGenerator {
    public static void main(String[] args) throws Exception {
        // Load secret from .env file
        Dotenv dotenv = Dotenv.load();
        String secret = dotenv.get("RAZORPAY_KEY_SECRET");

        // Test data
        String orderId = "order_S1fzqzDVqL7lOu"; // Replace with actual order_id
        String paymentId = "pay_TESTabc555xyz"; // Replace with test payment_id

        // Create payload: order_id|payment_id
        String payload = orderId + "|" + paymentId;

        // Generate HMAC-SHA256 signature
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        sha256_HMAC.init(secretKey);
        byte[] hash = sha256_HMAC.doFinal(payload.getBytes());

        String signature = Hex.encodeHexString(hash);
        System.out.println("Generated Signature: " + signature);
    }
}
