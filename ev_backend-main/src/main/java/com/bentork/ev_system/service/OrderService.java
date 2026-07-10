package com.bentork.ev_system.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.AssignOrderDTO;
import com.bentork.ev_system.dto.request.CreateOrderDTO;
import com.bentork.ev_system.dto.request.UpdateOrderStatusDTO;
import com.bentork.ev_system.dto.response.OrderResponse;
import com.bentork.ev_system.enums.OrderStatus;
import com.bentork.ev_system.model.Order;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    // ==================== ADMIN METHODS ====================

    public OrderResponse createOrder(CreateOrderDTO dto, String adminEmail) {
        User assignedUser = userRepository.findById(dto.getAssignToUserId())
                .orElseThrow(() -> new IllegalArgumentException("Assigned user not found with ID: " + dto.getAssignToUserId()));

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setTitle(dto.getTitle());
        order.setDescription(dto.getDescription());
        if (dto.getPriority() != null && !dto.getPriority().isEmpty()) {
            order.setPriority(dto.getPriority());
        }
        order.setAssignedToUserId(assignedUser.getId());
        order.setAssignedToUserEmail(assignedUser.getEmail());
        order.setAssignedToUserName(assignedUser.getName());
        order.setCreatedByAdminEmail(adminEmail);
        order.setStatus(OrderStatus.PENDING.getValue());
        
        if (dto.getAdminNotes() != null && !dto.getAdminNotes().trim().isEmpty()) {
            order.appendAdminNote("Order created. " + dto.getAdminNotes());
        } else {
            order.appendAdminNote("Order created.");
        }

        Order saved = orderRepository.save(order);
        log.info("Order {} created and assigned to {} by admin {}", saved.getOrderNumber(), assignedUser.getEmail(), adminEmail);

        sendUserNotification(assignedUser.getEmail(), 
                "📋 New Order Assigned", 
                "You have a new order: " + saved.getTitle() + ". Check the app for details.");

        return mapToResponse(saved);
    }

    public OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusDTO dto, String adminEmail) {
        Order order = findOrderById(orderId);
        OrderStatus currentStatus = OrderStatus.fromString(order.getStatus());
        OrderStatus targetStatus = OrderStatus.fromString(dto.getStatus());

        if (targetStatus == null) {
            throw new IllegalArgumentException("Unknown target status: " + dto.getStatus());
        }

        if (!OrderStatus.isValidTransition(currentStatus, targetStatus)) {
            throw new IllegalArgumentException("Invalid status transition from " + currentStatus.getValue() + " to " + targetStatus.getValue());
        }

        order.setStatus(targetStatus.getValue());
        order.setLastUpdatedByAdminEmail(adminEmail);

        String noteToAppend = "Status updated to " + targetStatus.getValue().toUpperCase() + " by " + adminEmail + ".";
        if (dto.getAdminNotes() != null && !dto.getAdminNotes().trim().isEmpty()) {
            noteToAppend += " Note: " + dto.getAdminNotes();
        }

        switch (targetStatus) {
            case IN_PROGRESS:
                order.setInProgressAt(LocalDateTime.now());
                sendUserNotification(order.getAssignedToUserEmail(), "🔄 Order In Progress", "Your order '" + order.getTitle() + "' is now being worked on.");
                break;
            case TESTING:
                order.setTestingAt(LocalDateTime.now());
                sendUserNotification(order.getAssignedToUserEmail(), "🧪 Order Testing", "Your order '" + order.getTitle() + "' is in testing phase.");
                break;
            case COMPLETED:
                order.setCompletedAt(LocalDateTime.now());
                sendUserNotification(order.getAssignedToUserEmail(), "✅ Order Completed", "Your order '" + order.getTitle() + "' has been completed.");
                break;
            case DISPATCHED:
                order.setDispatchedAt(LocalDateTime.now());
                sendUserNotification(order.getAssignedToUserEmail(), "🚚 Order Dispatched", "Your order '" + order.getTitle() + "' has been dispatched.");
                break;
            case DELIVERED:
                order.setDeliveredAt(LocalDateTime.now());
                sendUserNotification(order.getAssignedToUserEmail(), "📦 Order Delivered", "Your order '" + order.getTitle() + "' has been delivered.");
                break;
            case CANCELLED:
                if (dto.getCancelReason() == null || dto.getCancelReason().trim().isEmpty()) {
                    throw new IllegalArgumentException("Cancel reason is required when cancelling an order");
                }
                order.setCancelReason(dto.getCancelReason());
                order.setCancelledAt(LocalDateTime.now());
                noteToAppend += " Reason: " + dto.getCancelReason();
                sendUserNotification(order.getAssignedToUserEmail(), "❌ Order Cancelled", "Your order '" + order.getTitle() + "' has been cancelled. Reason: " + dto.getCancelReason());
                break;
            default:
                break;
        }

        order.appendAdminNote(noteToAppend);

        Order saved = orderRepository.save(order);
        log.info("Order {} status updated to {} by {}", orderId, targetStatus.getValue(), adminEmail);

        return mapToResponse(saved);
    }

    public OrderResponse reassignOrder(Long orderId, AssignOrderDTO dto, String adminEmail) {
        Order order = findOrderById(orderId);
        
        OrderStatus currentStatus = OrderStatus.fromString(order.getStatus());
        if (currentStatus == OrderStatus.DELIVERED || currentStatus == OrderStatus.CANCELLED) {
             throw new IllegalArgumentException("Cannot reassign a completed or cancelled order.");
        }

        User newUser = userRepository.findById(dto.getAssignToUserId())
                .orElseThrow(() -> new IllegalArgumentException("New assigned user not found with ID: " + dto.getAssignToUserId()));

        String oldEmail = order.getAssignedToUserEmail();
        
        order.setAssignedToUserId(newUser.getId());
        order.setAssignedToUserEmail(newUser.getEmail());
        order.setAssignedToUserName(newUser.getName());
        order.setLastUpdatedByAdminEmail(adminEmail);

        String note = "Order reassigned from " + oldEmail + " to " + newUser.getEmail() + " by " + adminEmail + ".";
        if (dto.getAdminNotes() != null && !dto.getAdminNotes().trim().isEmpty()) {
            note += " Note: " + dto.getAdminNotes();
        }
        order.appendAdminNote(note);

        Order saved = orderRepository.save(order);
        log.info("Order {} reassigned to {} by {}", orderId, newUser.getEmail(), adminEmail);

        // Notify new user
        sendUserNotification(newUser.getEmail(), 
                "📋 New Order Assigned", 
                "You have been assigned an existing order: " + saved.getTitle() + ". Check the app for details.");

        return mapToResponse(saved);
    }

    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<OrderResponse> getOrdersByStatus(String status) {
        return orderRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public OrderResponse getOrderDetail(Long orderId) {
        return mapToResponse(findOrderById(orderId));
    }

    // ==================== USER METHODS ====================

    public List<OrderResponse> getMyOrders(String userEmail) {
        return orderRepository.findByAssignedToUserEmailOrderByCreatedAtDesc(userEmail).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public OrderResponse getMyOrderDetail(Long orderId, String userEmail) {
        Order order = orderRepository.findByIdAndAssignedToUserEmail(orderId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Order not found or you don't have access"));
        return mapToResponse(order);
    }

    // ==================== PRIVATE HELPERS ====================

    private Order findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));
    }

    private void sendUserNotification(String userEmail, String title, String body) {
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isPresent()) {
            String token = userOpt.get().getFcmToken();
            if (token != null && !token.isEmpty()) {
                pushNotificationService.sendNotification(token, title, body);
            } else {
                log.warn("No FCM token found for user {}", userEmail);
            }
        } else {
            log.warn("User not found for email {} when sending order notification", userEmail);
        }
    }

    private String generateOrderNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "ORD-" + datePart + "-" + randomPart;
    }

    private OrderResponse mapToResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());
        response.setTitle(order.getTitle());
        response.setDescription(order.getDescription());
        response.setPriority(order.getPriority());
        response.setStatus(order.getStatus());
        response.setAssignedToUserName(order.getAssignedToUserName());
        response.setAssignedToUserEmail(order.getAssignedToUserEmail());
        response.setAssignedToUserId(order.getAssignedToUserId());
        response.setCreatedByAdminEmail(order.getCreatedByAdminEmail());
        response.setLastUpdatedByAdminEmail(order.getLastUpdatedByAdminEmail());
        response.setCancelReason(order.getCancelReason());
        response.setAdminNotes(order.getAdminNotes());

        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        response.setInProgressAt(order.getInProgressAt());
        response.setTestingAt(order.getTestingAt());
        response.setCompletedAt(order.getCompletedAt());
        response.setDispatchedAt(order.getDispatchedAt());
        response.setDeliveredAt(order.getDeliveredAt());
        response.setCancelledAt(order.getCancelledAt());

        if (order.getCreatedAt() != null && order.getCompletedAt() != null) {
            long minutes = Duration.between(order.getCreatedAt(), order.getCompletedAt()).toMinutes();
            response.setProcessingDurationHours(Math.round(minutes / 60.0 * 100.0) / 100.0);
        }

        return response;
    }
}
