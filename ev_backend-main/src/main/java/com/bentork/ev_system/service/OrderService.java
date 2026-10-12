package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateOrderDTO;
import com.bentork.ev_system.dto.request.OrderItemDTO;
import com.bentork.ev_system.dto.request.RecordPaymentDTO;
import com.bentork.ev_system.dto.request.ScmItemDTO;
import com.bentork.ev_system.dto.request.UpdateProductionStatusDTO;
import com.bentork.ev_system.dto.request.UpdateScmDetailsDTO;
import com.bentork.ev_system.dto.response.OrderItemResponse;
import com.bentork.ev_system.dto.response.OrderResponse;
import com.bentork.ev_system.dto.response.OrderTrackingResponseDTO;
import com.bentork.ev_system.enums.OrderStatus;
import com.bentork.ev_system.enums.PaymentStatus;
import com.bentork.ev_system.enums.ProductionStatus;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.model.Order;
import com.bentork.ev_system.model.OrderItem;
import com.bentork.ev_system.model.OrderTracking;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.BatteryDataRepository;
import com.bentork.ev_system.repository.OrderItemRepository;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final BatteryDataRepository batteryDataRepository;
    private final UserRepository userRepository;
    private final IUserNotificationService userNotificationService;

    // ==================== SALES ADMIN METHODS ====================

    /**
     * Create a new order (Sales Admin only).
     */
    @Transactional
    public OrderResponse createOrder(CreateOrderDTO dto, String salesAdminEmail) {
        // Parse and validate expected delivery date
        LocalDate deliveryDate;
        try {
            deliveryDate = LocalDate.parse(dto.getExpectedDeliveryDate());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date format for expectedDeliveryDate. Use yyyy-MM-dd format.");
        }

        // Validate assigned user exists
        User assignedUser = userRepository.findById(dto.getAssignedUserId())
                .orElseThrow(() -> new IllegalArgumentException("Assigned user ID not found in database"));

        // Validate payment amounts
        double receivedAmount = (dto.getReceivedAmount() != null) ? dto.getReceivedAmount() : 0.0;
        if (receivedAmount > dto.getTotalInvoiceAmount()) {
            throw new IllegalArgumentException("Received amount cannot exceed total invoice amount");
        }

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setAssignedUserId(assignedUser.getId());
        order.setCustomerName(dto.getCustomerName());
        order.setPiNumber(dto.getPiNumber());
        order.setMobileNumber(dto.getMobileNumber());
        order.setExpectedDeliveryDate(deliveryDate);
        order.setTotalInvoiceAmount(dto.getTotalInvoiceAmount());
        order.setReceivedAmount(receivedAmount);
        order.setPendingAmount(dto.getTotalInvoiceAmount() - receivedAmount);
        order.setPriority(dto.getPriority());
        if (dto.getWarrantyStartDate() != null && !dto.getWarrantyStartDate().isEmpty()) {
            order.setWarrantyStartDate(LocalDate.parse(dto.getWarrantyStartDate()));
        }
        if (dto.getWarrantyEndDate() != null && !dto.getWarrantyEndDate().isEmpty()) {
            order.setWarrantyEndDate(LocalDate.parse(dto.getWarrantyEndDate()));
        }
        order.setOrderStatus(OrderStatus.SALES_REGISTERED.getValue());
        order.setProductionStatus(ProductionStatus.CONFIRM.getValue());
        order.setCreatedByAdminEmail(salesAdminEmail);

        // Build order items from DTO
        populateOrderItems(order, dto.getOrderItems());

        // Auto-compute payment status and trigger production if fully paid
        updatePaymentStatusAndTriggerProduction(order);

        Order saved = orderRepository.save(order);
        log.info("Order {} created by Sales Admin {}", saved.getOrderNumber(), PiiMaskingUtil.maskEmail(salesAdminEmail));

        userNotificationService.createNotification(assignedUser.getId(),
                "Order Created",
                "Your order " + saved.getOrderNumber() + " has been registered.",
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    /**
     * Get orders created by the current Sales Admin.
     */
    public List<OrderResponse> getSalesAdminOrders(String salesAdminEmail) {
        return orderRepository.findByCreatedByAdminEmailOrderByCreatedAtDesc(salesAdminEmail).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order detail for Sales Admin (must be the creator).
     */
    public OrderResponse getSalesAdminOrderDetail(Long orderId, String salesAdminEmail) {
        Order order = findOrderById(orderId);
        if (!order.getCreatedByAdminEmail().equals(salesAdminEmail)) {
            throw new IllegalArgumentException("You do not have access to this order");
        }
        return mapToResponse(order);
    }

    /**
     * Update sales-stage fields on an order (Sales Admin only, must be the creator).
     */
    @Transactional
    public OrderResponse updateSalesOrder(Long orderId, CreateOrderDTO dto, String salesAdminEmail) {
        Order order = findOrderById(orderId);

        // Verify permissions and status
        if (!order.getCreatedByAdminEmail().equals(salesAdminEmail)) {
            throw new IllegalArgumentException("You can only edit orders you created");
        }
        if (!OrderStatus.SALES_REGISTERED.getValue().equals(order.getOrderStatus())) {
            throw new IllegalArgumentException("Cannot update order that has moved past sales stage");
        }

        // Validate assigned user exists
        User assignedUser = userRepository.findById(dto.getAssignedUserId())
                .orElseThrow(() -> new IllegalArgumentException("Assigned user ID not found in database"));

        // Parse and validate expected delivery date
        LocalDate deliveryDate;
        try {
            deliveryDate = LocalDate.parse(dto.getExpectedDeliveryDate());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid date format for expectedDeliveryDate. Use yyyy-MM-dd format.");
        }

        // Validate payment amounts
        double receivedAmount = (dto.getReceivedAmount() != null) ? dto.getReceivedAmount() : 0.0;
        if (receivedAmount > dto.getTotalInvoiceAmount()) {
            throw new IllegalArgumentException("Received amount cannot exceed total invoice amount");
        }

        order.setAssignedUserId(assignedUser.getId());
        order.setCustomerName(dto.getCustomerName());
        order.setPiNumber(dto.getPiNumber());
        order.setMobileNumber(dto.getMobileNumber());
        order.setExpectedDeliveryDate(deliveryDate);
        order.setTotalInvoiceAmount(dto.getTotalInvoiceAmount());
        order.setReceivedAmount(receivedAmount);
        order.setPendingAmount(dto.getTotalInvoiceAmount() - receivedAmount);
        order.setPriority(dto.getPriority());
        if (dto.getWarrantyStartDate() != null && !dto.getWarrantyStartDate().isEmpty()) {
            order.setWarrantyStartDate(LocalDate.parse(dto.getWarrantyStartDate()));
        }
        if (dto.getWarrantyEndDate() != null && !dto.getWarrantyEndDate().isEmpty()) {
            order.setWarrantyEndDate(LocalDate.parse(dto.getWarrantyEndDate()));
        }

        // Replace order items
        order.getOrderItems().clear();
        populateOrderItems(order, dto.getOrderItems());

        // Auto-compute payment status and trigger production if fully paid
        updatePaymentStatusAndTriggerProduction(order);

        Order saved = orderRepository.save(order);
        log.info("Order {} updated by Sales Admin {}", saved.getOrderNumber(), PiiMaskingUtil.maskEmail(salesAdminEmail));

        return mapToResponse(saved);
    }

    // ==================== PRODUCTION ADMIN METHODS ====================

    /**
     * Get all orders that are in production pipeline (confirm, in_progress, testing).
     */
    public List<OrderResponse> getProductionOrders() {
        List<String> productionStatuses = Arrays.asList(
                ProductionStatus.CONFIRM.getValue(),
                ProductionStatus.IN_PROGRESS.getValue(),
                ProductionStatus.TESTING.getValue()
        );
        return orderRepository.findByProductionStatusInOrderByCreatedAtDesc(productionStatuses).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all completed order history for Production Admin.
     * Returns orders where production status is COMPLETED (i.e., orders that have
     * finished the production pipeline and moved on to SCM or dispatch).
     */
    public List<OrderResponse> getCompletedProductionOrders() {
        return orderRepository.findByProductionStatusOrderByCreatedAtDesc(
                ProductionStatus.COMPLETED.getValue()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order detail for Production Admin.
     */
    public OrderResponse getProductionOrderDetail(Long orderId) {
        Order order = findOrderById(orderId);
        return mapToResponse(order);
    }

    /**
     * Update production status only (Production Admin only).
     * Enforces valid transitions: PENDING -> IN_PROGRESS -> COMPLETED.
     * When COMPLETED, automatically sets orderStatus to PRODUCTION_COMPLETE.
     */
    public OrderResponse updateProductionStatus(Long orderId, UpdateProductionStatusDTO dto, String productionAdminEmail) {
        Order order = findOrderById(orderId);

        ProductionStatus currentProdStatus = ProductionStatus.fromString(order.getProductionStatus());
        ProductionStatus targetProdStatus = ProductionStatus.fromString(dto.getProductionStatus());

        if (targetProdStatus == null) {
            throw new IllegalArgumentException("Unknown production status: " + dto.getProductionStatus());
        }

        if (!ProductionStatus.isValidTransition(currentProdStatus, targetProdStatus)) {
            throw new IllegalArgumentException("Invalid production status transition from '"
                    + order.getProductionStatus() + "' to '" + dto.getProductionStatus() + "'");
        }

        // Update production status
        order.setProductionStatus(targetProdStatus.getValue());
        order.setProductionUpdatedByEmail(productionAdminEmail);

        // Update overall order status based on production status
        if (targetProdStatus == ProductionStatus.IN_PROGRESS || targetProdStatus == ProductionStatus.TESTING) {
            order.setOrderStatus(OrderStatus.IN_PRODUCTION.getValue());
        } else if (targetProdStatus == ProductionStatus.COMPLETED) {
            order.setOrderStatus(OrderStatus.PRODUCTION_COMPLETE.getValue());
            order.setProductionCompletedAt(LocalDateTime.now());
        }

        Order saved = orderRepository.save(order);
        log.info("Order {} production status updated to '{}' by Production Admin {}",
                orderId, targetProdStatus.getValue(), productionAdminEmail);

        userNotificationService.createNotification(saved.getAssignedUserId(),
                "Production Update",
                "Your order " + saved.getOrderNumber() + " is now in production status: " + targetProdStatus.getValue() + ".",
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    // ==================== SCM ADMIN METHODS ====================

    /**
     * Get all orders where production is completed (ready for SCM processing, or already processed/dispatched).
     */
    public List<OrderResponse> getScmOrders() {
        List<String> scmStatuses = Arrays.asList(
                OrderStatus.PRODUCTION_COMPLETE.getValue(),
                OrderStatus.SCM_COMPLETE.getValue(),
                OrderStatus.DISPATCHED.getValue()
        );
        return orderRepository.findByOrderStatusInOrderByCreatedAtDesc(scmStatuses).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order detail for SCM Admin.
     */
    public OrderResponse getScmOrderDetail(Long orderId) {
        Order order = findOrderById(orderId);

        // Verify the order is in production-complete state
        if (!ProductionStatus.COMPLETED.matches(order.getProductionStatus())) {
            throw new IllegalArgumentException("Order is not yet production-complete. Current production status: " + order.getProductionStatus());
        }

        return mapToResponse(order);
    }

    /**
     * Fill SCM details and mark order as SCM_COMPLETE (SCM Admin only).
     * Accepts per-item warranty and barcodes via ScmItemDTO.
     * Creates BatteryData records for each barcode with item-specific warranty.
     * Order-level warranty is set to the max across all items for summary.
     */
    @Transactional
    public OrderResponse updateScmDetails(Long orderId, UpdateScmDetailsDTO dto, String scmAdminEmail) {
        Order order = findOrderById(orderId);

        // Verify the order is in production-complete state
        OrderStatus currentStatus = OrderStatus.fromString(order.getOrderStatus());
        if (currentStatus != OrderStatus.PRODUCTION_COMPLETE) {
            throw new IllegalArgumentException("SCM details can only be filled when order status is PRODUCTION_COMPLETE. Current status: " + order.getOrderStatus());
        }

        List<BatteryData> batteryDataList = new ArrayList<>();
        List<String> allBarcodes = new ArrayList<>();
        int maxServiceWarranty = 0;
        int maxFullWarranty = 0;
        int totalBarcodesProvided = 0;

        for (ScmItemDTO scmItem : dto.getItems()) {
            // Validate the order item exists and belongs to this order
            OrderItem orderItem = orderItemRepository.findById(scmItem.getOrderItemId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Order item not found with ID: " + scmItem.getOrderItemId()));

            if (!orderItem.getOrder().getId().equals(order.getId())) {
                throw new IllegalArgumentException(
                        "Order item " + scmItem.getOrderItemId() + " does not belong to order " + orderId);
            }

            // Validate barcode count matches item quantity
            if (scmItem.getBarcodes().size() != orderItem.getQuantity()) {
                throw new IllegalArgumentException(
                        "Number of barcodes (" + scmItem.getBarcodes().size()
                        + ") does not match quantity (" + orderItem.getQuantity()
                        + ") for item '" + orderItem.getProductDetails() + "'");
            }

            // Set per-item warranty
            int itemTotalWarranty = scmItem.getServiceWarrantyMonths() + scmItem.getFullWarrantyMonths();
            orderItem.setServiceWarrantyMonths(scmItem.getServiceWarrantyMonths());
            orderItem.setFullWarrantyMonths(scmItem.getFullWarrantyMonths());
            orderItem.setTotalWarrantyMonths(itemTotalWarranty);
            orderItem.setBarcodes(String.join(",", scmItem.getBarcodes()));
            if (scmItem.getWarrantyStartDate() != null && !scmItem.getWarrantyStartDate().isEmpty()) {
                orderItem.setWarrantyStartDate(LocalDate.parse(scmItem.getWarrantyStartDate()));
            }
            if (scmItem.getWarrantyEndDate() != null && !scmItem.getWarrantyEndDate().isEmpty()) {
                orderItem.setWarrantyEndDate(LocalDate.parse(scmItem.getWarrantyEndDate()));
            }

            // Track max warranty for order-level summary
            maxServiceWarranty = Math.max(maxServiceWarranty, scmItem.getServiceWarrantyMonths());
            maxFullWarranty = Math.max(maxFullWarranty, scmItem.getFullWarrantyMonths());

            // Collect all barcodes
            allBarcodes.addAll(scmItem.getBarcodes());
            totalBarcodesProvided += scmItem.getBarcodes().size();

            // Create BatteryData records with item-specific warranty and product details
            for (String barcode : scmItem.getBarcodes()) {
                BatteryData batteryData = new BatteryData();
                batteryData.setCustomerName(order.getCustomerName());
                batteryData.setProductDetails(orderItem.getProductDetails());
                batteryData.setInvoiceNumber(dto.getInvoiceNumber());
                batteryData.setBarcode(barcode);
                
                if (scmItem.getWarrantyStartDate() != null && !scmItem.getWarrantyStartDate().isEmpty()) {
                    batteryData.setWarrantyStartDate(LocalDate.parse(scmItem.getWarrantyStartDate()));
                } else {
                    batteryData.setWarrantyStartDate(LocalDate.now());
                }

                if (scmItem.getWarrantyEndDate() != null && !scmItem.getWarrantyEndDate().isEmpty()) {
                    batteryData.setWarrantyEndDate(LocalDate.parse(scmItem.getWarrantyEndDate()));
                } else {
                    batteryData.setWarrantyEndDate(LocalDate.now().plusMonths(itemTotalWarranty));
                }
                
                batteryData.setCreatedByAdminEmail(scmAdminEmail);
                batteryDataList.add(batteryData);
            }
        }

        // Validate total barcodes match total order quantity
        int expectedQuantity = order.getTotalQuantity();
        if (expectedQuantity == 0) expectedQuantity = 1;
        if (totalBarcodesProvided != expectedQuantity) {
            throw new IllegalArgumentException(
                    "Total barcodes provided (" + totalBarcodesProvided
                    + ") does not match total order quantity (" + expectedQuantity + ").");
        }

        // Fill order-level SCM fields
        order.setInvoiceNumber(dto.getInvoiceNumber());
        order.setBarcode(String.join(",", allBarcodes));
        order.setServiceWarrantyMonths(maxServiceWarranty);
        order.setFullWarrantyMonths(maxFullWarranty);
        order.setTotalWarrantyMonths(maxServiceWarranty + maxFullWarranty);
        order.setTrackingId(dto.getTrackingId());
        
        if (dto.getWarrantyStartDate() != null && !dto.getWarrantyStartDate().isEmpty()) {
            order.setWarrantyStartDate(LocalDate.parse(dto.getWarrantyStartDate()));
        }
        if (dto.getWarrantyEndDate() != null && !dto.getWarrantyEndDate().isEmpty()) {
            order.setWarrantyEndDate(LocalDate.parse(dto.getWarrantyEndDate()));
        }
        
        order.setScmUpdatedByEmail(scmAdminEmail);
        order.setOrderStatus(OrderStatus.SCM_COMPLETE.getValue());
        order.setScmCompletedAt(LocalDateTime.now());

        Order saved = orderRepository.save(order);
        batteryDataRepository.saveAll(batteryDataList);

        log.info("Order {} SCM details filled by SCM Admin {}. Created {} BatteryData records.",
                orderId, scmAdminEmail, totalBarcodesProvided);

        userNotificationService.createNotification(saved.getAssignedUserId(),
                "SCM Processing Complete",
                "Your order " + saved.getOrderNumber() + " has been processed for shipping.",
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    /**
     * Mark an SCM-complete order as dispatched (SCM Admin only).
     */
    public OrderResponse markDispatched(Long orderId, String scmAdminEmail) {
        Order order = findOrderById(orderId);

        OrderStatus currentStatus = OrderStatus.fromString(order.getOrderStatus());
        if (currentStatus != OrderStatus.SCM_COMPLETE) {
            throw new IllegalArgumentException("Order can only be dispatched when status is SCM_COMPLETE. Current status: " + order.getOrderStatus());
        }

        order.setOrderStatus(OrderStatus.DISPATCHED.getValue());
        order.setDispatchedAt(LocalDateTime.now());
        order.setScmUpdatedByEmail(scmAdminEmail);

        Order saved = orderRepository.save(order);
        log.info("Order {} marked as DISPATCHED by SCM Admin {}", orderId, PiiMaskingUtil.maskEmail(scmAdminEmail));

        userNotificationService.createNotification(saved.getAssignedUserId(),
                "Order Dispatched",
                "Your order " + saved.getOrderNumber() + " has been dispatched!",
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    /**
     * Admin marks a dispatched order as delivered (SCM Admin / Super Admin).
     * This is the admin-side counterpart to user's confirmDelivery().
     */
    @Transactional
    public OrderResponse markDelivered(Long orderId, String adminNotes, String scmAdminEmail) {
        Order order = findOrderById(orderId);

        OrderStatus currentStatus = OrderStatus.fromString(order.getOrderStatus());
        if (currentStatus != OrderStatus.DISPATCHED) {
            throw new IllegalArgumentException(
                    "Order can only be marked as delivered when status is DISPATCHED. Current status: "
                            + order.getOrderStatus());
        }

        order.setOrderStatus(OrderStatus.DELIVERED.getValue());
        order.setDeliveredAt(LocalDateTime.now());
        order.setScmUpdatedByEmail(scmAdminEmail);

        // Add a tracking update for audit trail
        OrderTracking tracking = new OrderTracking();
        tracking.setOrder(order);
        tracking.setStatus("delivered");
        tracking.setDescription(adminNotes != null ? "Admin confirmed delivery: " + adminNotes
                : "Admin confirmed delivery");
        tracking.setCreatedByAdminEmail(scmAdminEmail);
        tracking.setTrackingTimestamp(LocalDateTime.now());
        order.getTrackingUpdates().add(tracking);

        Order saved = orderRepository.save(order);
        log.info("Order {} marked as DELIVERED by Admin {}", orderId, PiiMaskingUtil.maskEmail(scmAdminEmail));

        userNotificationService.createNotification(saved.getAssignedUserId(),
                "Order Delivered",
                "Your order " + saved.getOrderNumber() + " has been confirmed as delivered.",
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    // ==================== SALES ADMIN — RECORD PAYMENT ====================

    /**
     * Record a payment against an existing order (Sales Admin only, must be the creator).
     * Increments the receivedAmount by the given payment amount.
     * Auto-computes pendingAmount and paymentStatus.
     * If pendingAmount reaches zero, auto-triggers production.
     */
    @Transactional
    public OrderResponse recordPayment(Long orderId, RecordPaymentDTO dto, String salesAdminEmail) {
        Order order = findOrderById(orderId);

        // Verify permissions
        if (!order.getCreatedByAdminEmail().equals(salesAdminEmail)) {
            throw new IllegalArgumentException("You can only record payments on orders you created");
        }

        // Validate not overpaying
        double newReceived = order.getReceivedAmount() + dto.getAmount();
        if (newReceived > order.getTotalInvoiceAmount()) {
            throw new IllegalArgumentException(
                    "Payment of " + dto.getAmount() + " exceeds remaining pending amount of " + order.getPendingAmount());
        }

        order.setReceivedAmount(newReceived);
        order.setPendingAmount(order.getTotalInvoiceAmount() - newReceived);

        // Auto-compute payment status and trigger production if fully paid
        updatePaymentStatusAndTriggerProduction(order);

        Order saved = orderRepository.save(order);
        log.info("Order {} payment of {} recorded by Sales Admin {}. New received: {}, pending: {}",
                saved.getOrderNumber(), dto.getAmount(), salesAdminEmail,
                saved.getReceivedAmount(), saved.getPendingAmount());

        userNotificationService.createNotification(saved.getAssignedUserId(),
                "Payment Received",
                "Payment of " + dto.getAmount() + " recorded for order " + saved.getOrderNumber()
                        + ". Pending: " + saved.getPendingAmount(),
                "ORDER_UPDATE");

        return mapToResponse(saved);
    }

    // ==================== SHARED METHODS ====================

    /**
     * Get all orders assigned to the currently logged-in user.
     */
    public List<OrderResponse> getUserOrders(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return orderRepository.findByAssignedUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order detail for the user (must match assigned user ID).
     */
    public OrderResponse getUserOrderDetail(Long orderId, String userEmail) {
        Order order = findOrderById(orderId);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.getId().equals(order.getAssignedUserId())) {
            throw new IllegalArgumentException("You do not have access to this order.");
        }

        return mapToResponse(order);
    }

    /**
     * User confirms delivery of their dispatched order.
     */
    @Transactional
    public OrderResponse confirmDelivery(Long orderId, String userEmail) {
        Order order = findOrderById(orderId);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.getId().equals(order.getAssignedUserId())) {
            throw new IllegalArgumentException("You do not have access to this order.");
        }

        OrderStatus currentStatus = OrderStatus.fromString(order.getOrderStatus());
        if (currentStatus != OrderStatus.DISPATCHED) {
            throw new IllegalArgumentException("Only dispatched orders can be confirmed as delivered. Current status: " + order.getOrderStatus());
        }

        order.setOrderStatus(OrderStatus.DELIVERED.getValue());
        order.setDeliveredAt(LocalDateTime.now());

        Order saved = orderRepository.save(order);
        log.info("Order {} confirmed as DELIVERED by User {}", orderId, PiiMaskingUtil.maskEmail(userEmail));

        return mapToResponse(saved);
    }

    /**
     * Get all orders (for ADMIN role — super admin view).
     */
    public List<OrderResponse> getAllOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order detail (any authorized admin).
     */
    public OrderResponse getOrderDetail(Long orderId) {
        return mapToResponse(findOrderById(orderId));
    }

    // ==================== PRIVATE HELPERS ====================

    private Order findOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));
    }

    private String generateOrderNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "ORD-" + datePart + "-" + randomPart;
    }

    /**
     * Auto-computes paymentStatus based on amounts and triggers production if fully paid.
     * - receivedAmount == 0 → PENDING
     * - receivedAmount > 0 && pendingAmount > 0 → PARTIAL
     * - pendingAmount <= 0 → PAID → auto-move to IN_PRODUCTION if still in SALES_REGISTERED
     */
    private void updatePaymentStatusAndTriggerProduction(Order order) {
        if (order.getPendingAmount() <= 0) {
            order.setPaymentStatus(PaymentStatus.PAID.getValue());
            // Auto-trigger production if still in sales_registered
            if (OrderStatus.SALES_REGISTERED.matches(order.getOrderStatus())) {
                order.setOrderStatus(OrderStatus.IN_PRODUCTION.getValue());
                log.info("Order {} auto-moved to IN_PRODUCTION (fully paid)", order.getOrderNumber());
            }
        } else if (order.getReceivedAmount() > 0) {
            order.setPaymentStatus(PaymentStatus.PARTIAL.getValue());
        } else {
            order.setPaymentStatus(PaymentStatus.PENDING.getValue());
        }
    }

    /**
     * Populates OrderItem entities from DTOs and sets legacy fields for backward compat.
     */
    private void populateOrderItems(Order order, List<OrderItemDTO> itemDTOs) {
        int totalQuantity = 0;
        for (OrderItemDTO itemDTO : itemDTOs) {
            OrderItem item = new OrderItem(order, itemDTO.getProductDetails(), itemDTO.getQuantity());
            if (itemDTO.getWarrantyStartDate() != null && !itemDTO.getWarrantyStartDate().isEmpty()) {
                item.setWarrantyStartDate(LocalDate.parse(itemDTO.getWarrantyStartDate()));
            }
            if (itemDTO.getWarrantyEndDate() != null && !itemDTO.getWarrantyEndDate().isEmpty()) {
                item.setWarrantyEndDate(LocalDate.parse(itemDTO.getWarrantyEndDate()));
            }
            order.getOrderItems().add(item);
            totalQuantity += itemDTO.getQuantity();
        }
        // Populate legacy fields from the items
        order.setProductDetails(itemDTOs.get(0).getProductDetails());
        order.setQuantity(totalQuantity);
    }

    private OrderResponse mapToResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());
        response.setAssignedUserId(order.getAssignedUserId());

        // Sales stage fields
        response.setCustomerName(order.getCustomerName());
        response.setPiNumber(order.getPiNumber());
        response.setProductDetails(order.getProductDetails());
        response.setQuantity(order.getTotalQuantity());
        response.setMobileNumber(order.getMobileNumber());
        response.setExpectedDeliveryDate(order.getExpectedDeliveryDate());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setTotalInvoiceAmount(order.getTotalInvoiceAmount());
        response.setReceivedAmount(order.getReceivedAmount());
        response.setPendingAmount(order.getPendingAmount());
        response.setPriority(order.getPriority());

        // Order items (multiple products) with per-item warranty
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            List<OrderItemResponse> itemResponses = order.getOrderItems().stream()
                    .map(item -> {
                        OrderItemResponse itemResp = new OrderItemResponse();
                        itemResp.setId(item.getId());
                        itemResp.setProductDetails(item.getProductDetails());
                        itemResp.setQuantity(item.getQuantity());
                        itemResp.setServiceWarrantyMonths(item.getServiceWarrantyMonths());
                        itemResp.setFullWarrantyMonths(item.getFullWarrantyMonths());
                        itemResp.setTotalWarrantyMonths(item.getTotalWarrantyMonths());
                        itemResp.setWarrantyStartDate(item.getWarrantyStartDate());
                        itemResp.setWarrantyEndDate(item.getWarrantyEndDate());
                        if (item.getBarcodes() != null && !item.getBarcodes().isEmpty()) {
                            itemResp.setBarcodes(Arrays.asList(item.getBarcodes().split(",")));
                        } else {
                            itemResp.setBarcodes(new ArrayList<>());
                        }
                        return itemResp;
                    })
                    .collect(Collectors.toList());
            response.setOrderItems(itemResponses);
        } else {
            // Backward compat: build a single-item list from legacy fields
            if (order.getProductDetails() != null) {
                OrderItemResponse legacyItem = new OrderItemResponse();
                legacyItem.setProductDetails(order.getProductDetails());
                legacyItem.setQuantity(order.getQuantity());
                response.setOrderItems(List.of(legacyItem));
            } else {
                response.setOrderItems(new ArrayList<>());
            }
        }

        // Tracking updates
        if (order.getTrackingUpdates() != null && !order.getTrackingUpdates().isEmpty()) {
            List<OrderTrackingResponseDTO> trackingResponses = order.getTrackingUpdates().stream()
                    .map(track -> {
                        OrderTrackingResponseDTO trackResp = new OrderTrackingResponseDTO();
                        trackResp.setId(track.getId());
                        trackResp.setStatus(track.getStatus());
                        trackResp.setLocation(track.getLocation());
                        trackResp.setDescription(track.getDescription());
                        trackResp.setTrackingTimestamp(track.getTrackingTimestamp());
                        trackResp.setCreatedByAdminEmail(track.getCreatedByAdminEmail());
                        return trackResp;
                    })
                    .collect(Collectors.toList());
            response.setTrackingUpdates(trackingResponses);
        } else {
            response.setTrackingUpdates(new ArrayList<>());
        }

        // Lifecycle status
        response.setOrderStatus(order.getOrderStatus());

        // Production stage
        response.setProductionStatus(order.getProductionStatus());

        // SCM stage
        response.setInvoiceNumber(order.getInvoiceNumber());
        if (order.getBarcode() != null && !order.getBarcode().isEmpty()) {
            response.setBarcodes(Arrays.asList(order.getBarcode().split(",")));
        } else {
            response.setBarcodes(new ArrayList<>());
        }
        response.setServiceWarrantyMonths(order.getServiceWarrantyMonths());
        response.setFullWarrantyMonths(order.getFullWarrantyMonths());
        response.setTotalWarrantyMonths(order.getTotalWarrantyMonths());
        response.setWarrantyStartDate(order.getWarrantyStartDate());
        response.setWarrantyEndDate(order.getWarrantyEndDate());
        response.setTrackingId(order.getTrackingId());

        // Audit fields
        response.setCreatedByAdminEmail(order.getCreatedByAdminEmail());
        response.setProductionUpdatedByEmail(order.getProductionUpdatedByEmail());
        response.setScmUpdatedByEmail(order.getScmUpdatedByEmail());

        // Timestamps
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        response.setProductionCompletedAt(order.getProductionCompletedAt());
        response.setScmCompletedAt(order.getScmCompletedAt());
        response.setDispatchedAt(order.getDispatchedAt());
        response.setDeliveredAt(order.getDeliveredAt());

        return response;
    }
}
