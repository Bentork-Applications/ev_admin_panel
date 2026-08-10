package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.RFIDCardRequest;
import com.bentork.ev_system.model.RFIDCard;
import com.bentork.ev_system.service.RFIDCardService;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rfid-card")
public class RFIDCardController {
    private final RFIDCardService cardService;

    // Register card
    @PostMapping("/register")
    public ResponseEntity<RFIDCard> register(@RequestBody RFIDCardRequest req) {
        log.info("POST /api/rfid-card/register - Registering RFID card, cardNumber={}, userId={}",
                req.getCardNumber(), req.getUserId());

        try {
            RFIDCard card = cardService.registerCard(req);
            log.info("POST /api/rfid-card/register - Success, cardId={}, cardNumber={}",
                    card.getId(), card.getCardNumber());
            return ResponseEntity.status(HttpStatus.CREATED).body(card);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("User not found")) {
                log.error("POST /api/rfid-card/register - User not found: userId={}", req.getUserId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            log.error("POST /api/rfid-card/register - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get all cards
    @GetMapping
    public ResponseEntity<List<RFIDCard>> getAll() {
        log.info("GET /api/rfid-card - Request received");

        try {
            List<RFIDCard> cards = cardService.getAllCards();
            log.info("GET /api/rfid-card - Success, returned {} cards", cards.size());
            return ResponseEntity.ok(cards);
        } catch (Exception e) {
            log.error("GET /api/rfid-card - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get one card
    @GetMapping("/{id}")
    public ResponseEntity<RFIDCard> getOne(@PathVariable Long id) {
        log.info("GET /api/rfid-card/{} - Request received", id);

        try {
            RFIDCard card = cardService.getCard(id);
            log.info("GET /api/rfid-card/{} - Success, cardNumber={}", id, card.getCardNumber());
            return ResponseEntity.ok(card);
        } catch (RuntimeException e) {
            log.warn("GET /api/rfid-card/{} - Card not found", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("GET /api/rfid-card/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Update card status
    @PutMapping("/{id}/status")
    public ResponseEntity<RFIDCard> updateStatus(
            @PathVariable Long id,
            @RequestBody RFIDCard reqCard) {
        log.info("PUT /api/rfid-card/{}/status - Updating card status, active={}",
                id, reqCard.isActive());

        try {
            // Only update status, ignore other fields
            RFIDCard updated = cardService.updateCardStatus(id, reqCard.isActive());
            log.info("PUT /api/rfid-card/{}/status - Success, active={}", id, updated.isActive());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("PUT /api/rfid-card/{}/status - Card not found", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("PUT /api/rfid-card/{}/status - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Delete card
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("DELETE /api/rfid-card/{} - Request received", id);

        try {
            cardService.deleteCard(id);
            log.info("DELETE /api/rfid-card/{} - Success", id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("DELETE /api/rfid-card/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Total Cards
    @GetMapping("/total")
    public ResponseEntity<Long> getTotalCards(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/rfid-card/total - Request received");

        try {
            Long total = cardService.getTotalCards();
            log.info("GET /api/rfid-card/total - Success, total={}", total);
            return ResponseEntity.ok(total);
        } catch (Exception e) {
            log.error("GET /api/rfid-card/total - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Active Cards
    @GetMapping("/active")
    public ResponseEntity<Long> getActiveCards(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/rfid-card/active - Request received");

        try {
            Long active = cardService.getActiveCards();
            log.info("GET /api/rfid-card/active - Success, active={}", active);
            return ResponseEntity.ok(active);
        } catch (Exception e) {
            log.error("GET /api/rfid-card/active - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Inactive Cards
    @GetMapping("/inactive")
    public ResponseEntity<Long> getInactiveCards(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/rfid-card/inactive - Request received");

        try {
            Long inactive = cardService.getInactiveCards();
            log.info("GET /api/rfid-card/inactive - Success, inactive={}", inactive);
            return ResponseEntity.ok(inactive);
        } catch (Exception e) {
            log.error("GET /api/rfid-card/inactive - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Recently Added - Last 7 days
    @GetMapping("/recent")
    public ResponseEntity<Long> getRecentlyAddedCards(@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("GET /api/rfid-card/recent - Request received");

        try {
            Long recent = cardService.getRecentlyAddedCards();
            log.info("GET /api/rfid-card/recent - Success, recent={}", recent);
            return ResponseEntity.ok(recent);
        } catch (Exception e) {
            log.error("GET /api/rfid-card/recent - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}