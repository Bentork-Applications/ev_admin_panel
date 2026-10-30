package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.PurchaseOrderRequestDTO;
import com.bentork.ev_system.dto.response.PurchaseOrderResponseDTO;
import com.bentork.ev_system.service.PurchaseOrderService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/procurement/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createPurchaseOrder(@Valid @RequestBody PurchaseOrderRequestDTO dto) {
        String adminEmail = getCurrentUserEmail();
        try {
            PurchaseOrderResponseDTO response = purchaseOrderService.createPurchaseOrder(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<List<PurchaseOrderResponseDTO>> getAllPurchaseOrders() {
        return ResponseEntity.ok(purchaseOrderService.getAllPurchaseOrders());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getPurchaseOrderById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(purchaseOrderService.getPurchaseOrderById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/vendor/{vendorId}")
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<List<PurchaseOrderResponseDTO>> getPurchaseOrdersByVendorId(@PathVariable Long vendorId) {
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrdersByVendorId(vendorId));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<?> approvePurchaseOrder(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(purchaseOrderService.approvePurchaseOrder(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
