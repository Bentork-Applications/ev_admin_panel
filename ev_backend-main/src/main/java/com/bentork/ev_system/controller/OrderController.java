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

import com.bentork.ev_system.dto.request.AssignOrderDTO;
import com.bentork.ev_system.dto.request.CreateOrderDTO;
import com.bentork.ev_system.dto.request.UpdateOrderStatusDTO;
import com.bentork.ev_system.dto.response.OrderResponse;
import com.bentork.ev_system.service.OrderService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    // ==================== USER (MOBILE APP) ENDPOINTS ====================

    /**
     * List user's own assigned orders.
     */
    @GetMapping("/user/my-orders")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<List<OrderResponse>> getMyOrders() {
        String userEmail = getCurrentUserEmail();
        log.info("Fetching orders for user {}", userEmail);
        return ResponseEntity.ok(orderService.getMyOrders(userEmail));
    }

    /**
     * View a specific order detail (user must own the order).
     */
    @GetMapping("/user/{id}")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<?> getMyOrderDetail(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        try {
            return ResponseEntity.ok(orderService.getMyOrderDetail(id, userEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // ==================== ADMIN/STAFF ENDPOINTS ====================

    /**
     * Create and assign a new order.
     */
    @PostMapping("/admin/create")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} creating a new order", adminEmail);
        try {
            OrderResponse response = orderService.createOrder(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Get all orders.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        log.info("Admin/Staff fetching all orders");
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    /**
     * Filter orders by status.
     */
    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<List<OrderResponse>> getOrdersByStatus(@PathVariable String status) {
        log.info("Admin/Staff fetching orders by status: {}", status);
        return ResponseEntity.ok(orderService.getOrdersByStatus(status));
    }

    /**
     * Get a specific order detail (admin view).
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> getOrderDetail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.getOrderDetail(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Update order status.
     */
    @PutMapping("/admin/{id}/update-status")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody UpdateOrderStatusDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} updating status for order {}", adminEmail, id);
        try {
            return ResponseEntity.ok(orderService.updateOrderStatus(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Reassign an order to a different user.
     */
    @PutMapping("/admin/{id}/reassign")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ADMIN_STAFF')")
    public ResponseEntity<?> reassignOrder(@PathVariable Long id, @RequestBody AssignOrderDTO dto) {
        String adminEmail = getCurrentUserEmail();
        log.info("Admin/Staff {} reassigning order {}", adminEmail, id);
        try {
            return ResponseEntity.ok(orderService.reassignOrder(id, dto, adminEmail));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
