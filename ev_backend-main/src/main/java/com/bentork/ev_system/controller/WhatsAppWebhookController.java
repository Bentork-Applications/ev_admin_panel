package com.bentork.ev_system.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.service.WhatsAppWebhookService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Webhook receiver for Meta WhatsApp Cloud API callbacks.
 * Handles webhook verification challenge (GET) and status/inbound message events (POST).
 * Implements FR-14, FR-20, FR-21, FR-22, Section 13.1.
 */
@RestController
@RequestMapping("/api/webhooks/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppWebhookService webhookService;

    @Value("${crm.whatsapp.campaign.webhook-verify-token:bentork_crm_verify_token_2026}")
    private String verifyToken;

    /**
     * Webhook verification challenge required by Meta.
     */
    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.verify_token", required = false) String token,
            @RequestParam(value = "hub.challenge", required = false) String challenge) {

        log.info("WhatsApp webhook verification received: mode={}, token={}", mode, token);

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("WhatsApp webhook verified successfully");
            return ResponseEntity.ok(challenge);
        } else {
            log.warn("WhatsApp webhook verification failed: expected token='{}', got='{}'", verifyToken, token);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification token mismatch");
        }
    }

    /**
     * Webhook event receiver for status callbacks and inbound replies.
     */
    @PostMapping
    public ResponseEntity<String> receiveWebhook(@RequestBody String payload) {
        log.debug("Received WhatsApp webhook event: {}", payload);

        // Process asynchronously / in transaction to ensure fast 200 OK response to Meta
        try {
            webhookService.processWebhook(payload);
        } catch (Exception e) {
            log.error("Error processing WhatsApp webhook: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}
