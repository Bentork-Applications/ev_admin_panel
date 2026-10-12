package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.IndiaMartPayloadDTO;
import com.bentork.ev_system.service.IndiaMartService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/webhooks/indiamart")
@RequiredArgsConstructor
@Slf4j
public class IndiaMartIntegrationController {

    private final IndiaMartService indiaMartService;

    @PostMapping
    public ResponseEntity<String> handleWebhook(@RequestBody IndiaMartPayloadDTO payload) {
        try {
            indiaMartService.processWebhookPayload(payload);
            return ResponseEntity.ok("Received");
        } catch (Exception e) {
            log.error("Error processing IndiaMART webhook", e);
            return ResponseEntity.internalServerError().body("Error processing payload");
        }
    }
}
