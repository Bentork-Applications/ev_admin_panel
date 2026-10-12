package com.bentork.ev_system.controller;

import com.bentork.ev_system.util.PiiMaskingUtil;

import java.util.List;

import jakarta.validation.Valid;

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

import com.bentork.ev_system.dto.request.ProductDTO;
import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.service.ProductService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;

    // ==================== ADMIN/STAFF ENDPOINTS ====================

    /**
     * Create a new product in the catalog.
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SCM_ADMIN')")
    public ResponseEntity<?> createProduct(@Valid @RequestBody ProductDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} creating product '{}'", PiiMaskingUtil.maskEmail(adminEmail), dto.getName());
        try {
            ProductResponse response = productService.createProduct(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Update an existing product.
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @PutMapping("/admin/update/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SCM_ADMIN')")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody ProductDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} updating product ID: {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            ProductResponse response = productService.updateProduct(id, dto, adminEmail);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all products including inactive (admin dashboard view).
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SALES_ADMIN', 'SCM_ADMIN')")
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        log.info("Admin/Staff fetching all products");
        return ResponseEntity.ok(productService.getAllProducts());
    }

    /**
     * Toggle product active/inactive status.
     * Accessible by ADMIN and ADMIN_STAFF.
     */
    @PutMapping("/admin/{id}/toggle-status")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SCM_ADMIN')")
    public ResponseEntity<?> toggleProductStatus(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} toggling product status for ID: {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            ProductResponse response = productService.toggleProductStatus(id, adminEmail);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // ==================== SHARED ENDPOINTS ====================

    /**
     * Get all active products (for dropdown selection during battery registration).
     * Accessible by any authenticated admin/staff user.
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SALES_ADMIN', 'SCM_ADMIN')")
    public ResponseEntity<List<ProductResponse>> getActiveProducts() {
        return ResponseEntity.ok(productService.getAllActiveProducts());
    }

    /**
     * Get a single product by ID.
     * Accessible by any authenticated admin/staff user.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SCM_ADMIN', 'SALES_ADMIN')")
    public ResponseEntity<?> getProductById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(productService.getProductById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Get active products filtered by category.
     * Accessible by any authenticated admin/staff user.
     */
    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF', 'SCM_ADMIN', 'SALES_ADMIN')")
    public ResponseEntity<List<ProductResponse>> getProductsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(productService.getProductsByCategory(category));
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
