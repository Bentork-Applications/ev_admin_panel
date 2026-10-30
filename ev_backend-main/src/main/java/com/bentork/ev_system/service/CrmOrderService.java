package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CrmRecordPaymentDTO;
import com.bentork.ev_system.dto.response.CrmPaymentResponse;
import com.bentork.ev_system.dto.response.OrderResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.enums.PaymentStatus;
import com.bentork.ev_system.model.Order;
import com.bentork.ev_system.repository.OrderRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * CRM-specific order service for payment recording and paginated order queries.
 * This complements the existing OrderService (which handles the production/SCM pipeline).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CrmOrderService {

    private final OrderRepository orderRepository;

    // ==================== CRM PAYMENT RECORDING ====================

    /**
     * Record a payment against an order from the CRM Sales Panel.
     * Updates receivedAmount, pendingAmount, and paymentStatus.
     */
    @Transactional
    public CrmPaymentResponse recordPayment(Long orderId, CrmRecordPaymentDTO dto, String adminEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        double currentReceived = order.getReceivedAmount() != null ? order.getReceivedAmount() : 0.0;
        double totalInvoice = order.getTotalInvoiceAmount() != null ? order.getTotalInvoiceAmount() : 0.0;
        double newReceived = currentReceived + dto.getAmount();

        if (newReceived > totalInvoice) {
            throw new IllegalArgumentException("Payment of ₹" + dto.getAmount()
                    + " would exceed total invoice amount (₹" + totalInvoice
                    + "). Current received: ₹" + currentReceived);
        }

        order.setReceivedAmount(newReceived);
        order.setPendingAmount(totalInvoice - newReceived);

        // Update payment status
        if (newReceived >= totalInvoice) {
            order.setPaymentStatus(PaymentStatus.PAID.getValue());
        } else if (newReceived > 0) {
            order.setPaymentStatus(PaymentStatus.PARTIAL.getValue());
        }

        Order saved = orderRepository.save(order);

        log.info("CRM Payment recorded: ₹{} for Order {} by {}. Status: {}",
                dto.getAmount(), order.getOrderNumber(), adminEmail, saved.getPaymentStatus());

        // Build response
        CrmPaymentResponse response = new CrmPaymentResponse();
        response.setOrderId(saved.getId());
        response.setOrderNumber(saved.getOrderNumber());
        response.setAmountPaid(dto.getAmount());
        response.setTotalInvoiceAmount(saved.getTotalInvoiceAmount());
        response.setReceivedAmount(saved.getReceivedAmount());
        response.setPendingAmount(saved.getPendingAmount());
        response.setPaymentStatus(saved.getPaymentStatus());
        response.setPaymentMethod(dto.getPaymentMethod());
        response.setReferenceNumber(dto.getReferenceNumber());
        response.setRecordedByAdminEmail(adminEmail);
        response.setRecordedAt(LocalDateTime.now());

        return response;
    }

    // ==================== PAGINATED ORDER QUERIES ====================

    /**
     * Server-side paginated query for all orders.
     */
    public PagedResponse<OrderSummary> getAllOrdersPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orderPage = orderRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<OrderSummary> content = orderPage.getContent().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
        return PagedResponse.of(content, page, size, orderPage.getTotalElements(), orderPage.getTotalPages(), orderPage.isLast());
    }

    // ==================== HELPERS ====================

    private OrderSummary mapToSummary(Order order) {
        OrderSummary summary = new OrderSummary();
        summary.id = order.getId();
        summary.orderNumber = order.getOrderNumber();
        summary.customerName = order.getCustomerName();
        summary.totalInvoiceAmount = order.getTotalInvoiceAmount();
        summary.receivedAmount = order.getReceivedAmount();
        summary.pendingAmount = order.getPendingAmount();
        summary.orderStatus = order.getOrderStatus();
        summary.paymentStatus = order.getPaymentStatus();
        summary.productionStatus = order.getProductionStatus();
        summary.createdAt = order.getCreatedAt();
        return summary;
    }

    /**
     * Lightweight order summary for paginated responses.
     */
    public static class OrderSummary {
        public Long id;
        public String orderNumber;
        public String customerName;
        public Double totalInvoiceAmount;
        public Double receivedAmount;
        public Double pendingAmount;
        public String orderStatus;
        public String paymentStatus;
        public String productionStatus;
        public LocalDateTime createdAt;
    }
}
