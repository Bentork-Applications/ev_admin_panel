package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.OrderTrackingRequestDTO;
import com.bentork.ev_system.dto.response.OrderTrackingResponseDTO;
import com.bentork.ev_system.model.Order;
import com.bentork.ev_system.model.OrderTracking;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.OrderTrackingRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderTrackingService {

    private final OrderTrackingRepository orderTrackingRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional
    public OrderTrackingResponseDTO addTrackingUpdate(Long orderId, OrderTrackingRequestDTO dto, String adminEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        OrderTracking tracking = new OrderTracking();
        tracking.setOrder(order);
        tracking.setStatus(dto.getStatus());
        tracking.setLocation(dto.getLocation());
        tracking.setDescription(dto.getDescription());
        tracking.setCreatedByAdminEmail(adminEmail);

        if (dto.getTrackingTimestamp() != null && !dto.getTrackingTimestamp().isEmpty()) {
            try {
                tracking.setTrackingTimestamp(LocalDateTime.parse(dto.getTrackingTimestamp()));
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid trackingTimestamp format. Use ISO-8601 (e.g., 2023-10-25T10:15:30)");
            }
        } else {
            tracking.setTrackingTimestamp(LocalDateTime.now());
        }

        OrderTracking saved = orderTrackingRepository.save(tracking);
        log.info("Added tracking update to order {} by Admin {}", orderId, adminEmail);

        return mapToResponse(saved);
    }

    @Transactional
    public OrderTrackingResponseDTO updateTrackingEvent(Long trackingId, OrderTrackingRequestDTO dto, String adminEmail) {
        OrderTracking tracking = orderTrackingRepository.findById(trackingId)
                .orElseThrow(() -> new IllegalArgumentException("Order tracking event not found with ID: " + trackingId));

        tracking.setStatus(dto.getStatus());
        tracking.setLocation(dto.getLocation());
        tracking.setDescription(dto.getDescription());
        
        if (dto.getTrackingTimestamp() != null && !dto.getTrackingTimestamp().isEmpty()) {
            try {
                tracking.setTrackingTimestamp(LocalDateTime.parse(dto.getTrackingTimestamp()));
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid trackingTimestamp format. Use ISO-8601.");
            }
        }

        OrderTracking saved = orderTrackingRepository.save(tracking);
        log.info("Updated tracking event {} by Admin {}", trackingId, adminEmail);

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteTrackingEvent(Long trackingId, String adminEmail) {
        if (!orderTrackingRepository.existsById(trackingId)) {
            throw new IllegalArgumentException("Order tracking event not found with ID: " + trackingId);
        }
        orderTrackingRepository.deleteById(trackingId);
        log.info("Deleted tracking event {} by Admin {}", trackingId, adminEmail);
    }

    public List<OrderTrackingResponseDTO> getTrackingForOrder(Long orderId) {
        // Validate order exists
        if (!orderRepository.existsById(orderId)) {
            throw new IllegalArgumentException("Order not found with ID: " + orderId);
        }
        return orderTrackingRepository.findByOrderIdOrderByTrackingTimestampDesc(orderId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<OrderTrackingResponseDTO> getTrackingForUserOrder(Long orderId, String userEmail) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.getId().equals(order.getAssignedUserId())) {
            throw new IllegalArgumentException("You do not have access to tracking for this order.");
        }

        return orderTrackingRepository.findByOrderIdOrderByTrackingTimestampDesc(orderId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private OrderTrackingResponseDTO mapToResponse(OrderTracking tracking) {
        OrderTrackingResponseDTO dto = new OrderTrackingResponseDTO();
        dto.setId(tracking.getId());
        dto.setStatus(tracking.getStatus());
        dto.setLocation(tracking.getLocation());
        dto.setDescription(tracking.getDescription());
        dto.setTrackingTimestamp(tracking.getTrackingTimestamp());
        dto.setCreatedByAdminEmail(tracking.getCreatedByAdminEmail());
        return dto;
    }
}
