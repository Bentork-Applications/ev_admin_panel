package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.OrderTrackingRequestDTO;
import com.bentork.ev_system.dto.response.OrderTrackingResponseDTO;
import com.bentork.ev_system.service.OrderTrackingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderTrackingController {

    private final OrderTrackingService orderTrackingService;

    // ==================== ADMIN ENDPOINTS ====================

    @PostMapping("/{orderId}/tracking")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> addTrackingUpdate(@PathVariable Long orderId, @Valid @RequestBody OrderTrackingRequestDTO dto) {
        String adminEmail = getCurrentUserEmail();
        try {
            OrderTrackingResponseDTO response = orderTrackingService.addTrackingUpdate(orderId, dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/tracking/{trackingId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> updateTrackingEvent(@PathVariable Long trackingId, @Valid @RequestBody OrderTrackingRequestDTO dto) {
        String adminEmail = getCurrentUserEmail();
        try {
            OrderTrackingResponseDTO response = orderTrackingService.updateTrackingEvent(trackingId, dto, adminEmail);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/tracking/{trackingId}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> deleteTrackingEvent(@PathVariable Long trackingId) {
        String adminEmail = getCurrentUserEmail();
        try {
            orderTrackingService.deleteTrackingEvent(trackingId, adminEmail);
            return ResponseEntity.ok("Tracking event deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/admin/{orderId}/tracking")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getTrackingForAdmin(@PathVariable Long orderId) {
        try {
            return ResponseEntity.ok(orderTrackingService.getTrackingForOrder(orderId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // ==================== USER ENDPOINTS ====================

    @GetMapping("/user/{orderId}/tracking")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'DEALER')")
    public ResponseEntity<?> getTrackingForUser(@PathVariable Long orderId) {
        String userEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(orderTrackingService.getTrackingForUserOrder(orderId, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
