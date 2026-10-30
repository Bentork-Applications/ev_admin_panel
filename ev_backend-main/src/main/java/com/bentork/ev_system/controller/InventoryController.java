package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/inventory/products")
@RequiredArgsConstructor
public class InventoryController {

    private final ProductRepository productRepository;

    @GetMapping("/lookup")
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<ProductResponse> lookupProductByBarcode(@RequestParam String code) {
        return productRepository.findByBarcode(code)
                .map(product -> ResponseEntity.ok(mapToResponse(product)))
                .orElse(ResponseEntity.notFound().build());
    }

    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setName(product.getName());
        response.setCategory(product.getCategory());
        response.setBrand(product.getBrand());
        return response;
    }
}
