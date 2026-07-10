package com.bentork.ev_system.service;

import jakarta.annotation.PostConstruct;
import org.apache.commons.codec.binary.Hex;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;

@Service
public class RazorpayService {

    private RazorpayClient razorpayClient;

    // INJECTED VALUES (Works on AWS & Local)
    @Value("${RAZORPAY_KEY_ID}")
    private String keyId;

    @Value("${RAZORPAY_KEY_SECRET}")
    private String keySecret;

    @PostConstruct
    public void init() throws RazorpayException {
        // Initialize client using the injected values
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }

    // Create Razorpay order
    public String createOrder(BigDecimal amountInRupees) throws RazorpayException {
        JSONObject request = new JSONObject();
        request.put("amount", amountInRupees.multiply(BigDecimal.valueOf(100))); // paise
        request.put("currency", "INR");
        request.put("receipt", "receipt#" + System.currentTimeMillis());
        request.put("payment_capture", 1);

        Order order = razorpayClient.Orders.create(request);
        return order.toString();
    }

    // Verify Razorpay payment signature
    public boolean verifySignature(String orderId, String paymentId, String razorpaySignature) throws Exception {
        // Use the injected keySecret directly
        String payload = orderId + "|" + paymentId;

        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(keySecret.getBytes(), "HmacSHA256");
        sha256_HMAC.init(secretKey);

        byte[] hash = sha256_HMAC.doFinal(payload.getBytes());
        String generatedSignature = Hex.encodeHexString(hash);

        return generatedSignature.equals(razorpaySignature);
    }

    public Order fetchOrder(String orderId) throws RazorpayException {
        return razorpayClient.Orders.fetch(orderId);
    }

    // Fetch order amount directly from Razorpay using order ID
    public BigDecimal getOrderAmountFromRazorpay(String orderId) throws RazorpayException {
        Order order = razorpayClient.Orders.fetch(orderId);
        int amountInPaise = order.get("amount"); // in paise
        return BigDecimal.valueOf(amountInPaise).divide(BigDecimal.valueOf(100));
    }
}