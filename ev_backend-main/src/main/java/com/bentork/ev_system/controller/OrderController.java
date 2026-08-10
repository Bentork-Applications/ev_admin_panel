package com.bentork.ev_system.controller;

import com.bentork.ev_system.util.PiiMaskingUtil;

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

import com.bentork.ev_system.dto.request.CreateOrderDTO;
import com.bentork.ev_system.dto.request.RecordPaymentDTO;
import com.bentork.ev_system.dto.request.UpdateProductionStatusDTO;
import com.bentork.ev_system.dto.request.UpdateScmDetailsDTO;
import com.bentork.ev_system.dto.response.OrderResponse;
import com.bentork.ev_system.service.OrderService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    // ==================== SALES ADMIN ENDPOINTS ====================

    /**
     * Create a new order (Sales Admin only).
     */
    @PostMapping("/sales/create")
    @PreAuthorize("hasAuthority('SALES_ADMIN')")
    public ResponseEntity<?> createOrder(@Valid @RequestBody CreateOrderDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Sales Admin {} creating a new order", PiiMaskingUtil.maskEmail(adminEmail));
        try {
            OrderResponse response = orderService.createOrder(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * List orders created by the current Sales Admin.
     */
    @GetMapping("/sales/my-orders")
    @PreAuthorize("hasAuthority('SALES_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getSalesAdminOrders() {
        String adminEmail = getCurrentUserEmail();
        log.info("Sales Admin {} fetching their orders", PiiMaskingUtil.maskEmail(adminEmail));
        return ResponseEntity.ok(orderService.getSalesAdminOrders(adminEmail));
    }

    /**
     * View a specific order detail (Sales Admin — must be the creator).
     */
    @GetMapping("/sales/{id}")
    @PreAuthorize("hasAuthority('SALES_ADMIN')")
    public ResponseEntity<?> getSalesAdminOrderDetail(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(orderService.getSalesAdminOrderDetail(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Update sales-stage fields on an order (Sales Admin — must be the creator, order still in SALES_REGISTERED).
     */
    @PutMapping("/sales/{id}/update")
    @PreAuthorize("hasAuthority('SALES_ADMIN')")
    public ResponseEntity<?> updateSalesOrder(@PathVariable Long id, @Valid @RequestBody CreateOrderDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Sales Admin {} updating order {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            return ResponseEntity.ok(orderService.updateSalesOrder(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Record a payment against an existing order (Sales Admin — must be the creator).
     */
    @PutMapping("/sales/{id}/record-payment")
    @PreAuthorize("hasAuthority('SALES_ADMIN')")
    public ResponseEntity<?> recordPayment(@PathVariable Long id, @Valid @RequestBody RecordPaymentDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Sales Admin {} recording payment for order {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            return ResponseEntity.ok(orderService.recordPayment(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== PRODUCTION ADMIN ENDPOINTS ====================

    /**
     * List orders in the production pipeline (pending or in_progress).
     */
    @GetMapping("/production/orders")
    @PreAuthorize("hasAuthority('PRODUCTION_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getProductionOrders() {
        log.info("Production Admin fetching production orders");
        return ResponseEntity.ok(orderService.getProductionOrders());
    }

    /**
     * List all completed order history (Production Admin — comprehensive view).
     */
    @GetMapping("/production/completed-orders")
    @PreAuthorize("hasAuthority('PRODUCTION_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getCompletedProductionOrders() {
        log.info("Production Admin fetching completed order history");
        return ResponseEntity.ok(orderService.getCompletedProductionOrders());
    }

    /**
     * View a specific order detail (Production Admin).
     */
    @GetMapping("/production/{id}")
    @PreAuthorize("hasAuthority('PRODUCTION_ADMIN')")
    public ResponseEntity<?> getProductionOrderDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.getProductionOrderDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Update production status only (Production Admin).
     */
    @PutMapping("/production/{id}/status")
    @PreAuthorize("hasAuthority('PRODUCTION_ADMIN')")
    public ResponseEntity<?> updateProductionStatus(@PathVariable Long id, @Valid @RequestBody UpdateProductionStatusDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Production Admin {} updating production status for order {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            return ResponseEntity.ok(orderService.updateProductionStatus(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== SCM ADMIN ENDPOINTS ====================

    /**
     * List orders where production is completed (ready for SCM).
     */
    @GetMapping("/scm/orders")
    @PreAuthorize("hasAuthority('SCM_ADMIN')")
    public ResponseEntity<List<OrderResponse>> getScmOrders() {
        log.info("SCM Admin fetching SCM-ready orders");
        return ResponseEntity.ok(orderService.getScmOrders());
    }

    /**
     * View a specific order detail (SCM Admin).
     */
    @GetMapping("/scm/{id}")
    @PreAuthorize("hasAuthority('SCM_ADMIN')")
    public ResponseEntity<?> getScmOrderDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.getScmOrderDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Fill SCM details (barcode, warranty, tracking) and mark order as SCM_COMPLETE.
     */
    @PutMapping("/scm/{id}/complete")
    @PreAuthorize("hasAuthority('SCM_ADMIN')")
    public ResponseEntity<?> updateScmDetails(@PathVariable Long id, @Valid @RequestBody UpdateScmDetailsDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("SCM Admin {} filling SCM details for order {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            return ResponseEntity.ok(orderService.updateScmDetails(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Mark an SCM-complete order as dispatched.
     */
    @PutMapping("/scm/{id}/dispatch")
    @PreAuthorize("hasAuthority('SCM_ADMIN')")
    public ResponseEntity<?> markDispatched(@PathVariable Long id) {
        String adminEmail = getCurrentUserEmail();
        log.info("SCM Admin {} dispatching order {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        try {
            return ResponseEntity.ok(orderService.markDispatched(id, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== ADMIN (SUPER) ENDPOINTS ====================

    /**
     * Get all orders (Super Admin view).
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        log.info("Admin fetching all orders");
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    /**
     * Get a specific order detail (Super Admin view).
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<?> getOrderDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.getOrderDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // ==================== USER ENDPOINTS ====================

    /**
     * List orders linked to the logged-in user's mobile number.
     */
    @GetMapping("/user/my-orders")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'DEALER')")
    public ResponseEntity<List<OrderResponse>> getUserOrders() {
        String userEmail = getCurrentUserEmail();
        log.info("User {} fetching their tracked orders", PiiMaskingUtil.maskEmail(userEmail));
        return ResponseEntity.ok(orderService.getUserOrders(userEmail));
    }

    /**
     * View a specific order detail (User — must match mobile number).
     */
    @GetMapping("/user/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_USER', 'DEALER')")
    public ResponseEntity<?> getUserOrderDetail(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(orderService.getUserOrderDetail(id, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
