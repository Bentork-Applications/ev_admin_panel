package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.response.InventoryStockResponseDTO;
import com.bentork.ev_system.service.InventoryStockService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/inventory/stock")
@RequiredArgsConstructor
public class InventoryStockController {

    private final InventoryStockService inventoryStockService;

    @GetMapping("/{productId}")
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<InventoryStockResponseDTO> getStockOverview(@PathVariable Long productId) {
        try {
            return ResponseEntity.ok(inventoryStockService.getStockOverview(productId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<InventoryStockResponseDTO>> getAllStocks() {
        return ResponseEntity.ok(inventoryStockService.getAllStocks());
    }
}
