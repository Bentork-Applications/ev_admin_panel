package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateQuotationDTO;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.dto.response.QuotationResponse;
import com.bentork.ev_system.enums.OpportunityStage;
import com.bentork.ev_system.enums.OrderStatus;
import com.bentork.ev_system.enums.PaymentStatus;
import com.bentork.ev_system.enums.ProductionStatus;
import com.bentork.ev_system.enums.QuotationStatus;
import com.bentork.ev_system.model.Opportunity;
import com.bentork.ev_system.model.Order;
import com.bentork.ev_system.model.OrderItem;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.model.Quotation;
import com.bentork.ev_system.model.QuotationItem;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.OpportunityRepository;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.ProductRepository;
import com.bentork.ev_system.repository.QuotationRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final OpportunityRepository opportunityRepository;
    private final SalesCompanyRepository companyRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional
    public QuotationResponse createQuotation(CreateQuotationDTO dto, String adminEmail) {
        SalesCompany company = companyRepository.findById(dto.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));

        Quotation quotation = new Quotation();
        quotation.setQuoteNumber(generateQuoteNumber());
        quotation.setCompany(company);
        quotation.setStatus(QuotationStatus.DRAFT.getValue());
        quotation.setDiscount(dto.getDiscount() != null ? dto.getDiscount() : 0.0);
        quotation.setTermsAndConditions(dto.getTermsAndConditions());
        quotation.setCreatedByAdminEmail(adminEmail);

        if (dto.getValidUntil() != null && !dto.getValidUntil().isEmpty()) {
            quotation.setValidUntil(LocalDate.parse(dto.getValidUntil()));
        }
        if (dto.getOpportunityId() != null) {
            Opportunity opp = opportunityRepository.findById(dto.getOpportunityId())
                    .orElseThrow(() -> new IllegalArgumentException("Opportunity not found"));
            quotation.setOpportunity(opp);
        }

        // Build line items
        double totalAmount = 0;
        for (CreateQuotationDTO.QuotationLineItemDTO itemDto : dto.getItems()) {
            QuotationItem item = new QuotationItem();
            item.setQuotation(quotation);
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(itemDto.getUnitPrice());
            item.setTotalPrice(itemDto.getQuantity() * itemDto.getUnitPrice());

            if (itemDto.getProductId() != null) {
                Product product = productRepository.findById(itemDto.getProductId())
                        .orElseThrow(() -> new IllegalArgumentException("Product not found: " + itemDto.getProductId()));
                item.setProductId(product.getId());
                item.setProductDescription(
                        itemDto.getProductDescription() != null ? itemDto.getProductDescription() : product.buildSpecString());
            } else {
                item.setProductDescription(itemDto.getProductDescription());
            }

            quotation.getItems().add(item);
            totalAmount += item.getTotalPrice();
        }

        quotation.setTotalAmount(totalAmount);
        double discountAmount = quotation.getDiscount() != null ? quotation.getDiscount() : 0.0;
        quotation.setFinalAmount(totalAmount - discountAmount);

        Quotation saved = quotationRepository.save(quotation);
        log.info("Quotation {} created by {}", saved.getQuoteNumber(), adminEmail);
        return mapToResponse(saved);
    }

    public QuotationResponse markAsSent(Long quotationId) {
        Quotation quotation = findById(quotationId);
        if (!QuotationStatus.DRAFT.matches(quotation.getStatus())) {
            throw new IllegalArgumentException("Only DRAFT quotations can be sent");
        }
        quotation.setStatus(QuotationStatus.SENT.getValue());
        return mapToResponse(quotationRepository.save(quotation));
    }

    /**
     * Accept a quotation. This also automatically marks the linked Opportunity as WON,
     * completing the sales pipeline progression.
     */
    @Transactional
    public QuotationResponse markAsAccepted(Long quotationId) {
        Quotation quotation = findById(quotationId);
        if (!QuotationStatus.SENT.matches(quotation.getStatus())) {
            throw new IllegalArgumentException("Only SENT quotations can be accepted");
        }
        quotation.setStatus(QuotationStatus.ACCEPTED.getValue());
        Quotation saved = quotationRepository.save(quotation);

        // Auto-mark the linked Opportunity as WON
        if (quotation.getOpportunity() != null) {
            Opportunity opp = quotation.getOpportunity();
            if (!OpportunityStage.WON.matches(opp.getStage()) && !OpportunityStage.LOST.matches(opp.getStage())) {
                opp.setStage(OpportunityStage.WON.getValue());
                opp.setProbability(OpportunityStage.WON.getProbability());
                opportunityRepository.save(opp);
                log.info("Opportunity {} auto-marked as WON (quotation {} accepted)",
                        opp.getOpportunityNumber(), quotation.getQuoteNumber());
            }
        }

        return mapToResponse(saved);
    }

    public QuotationResponse markAsRejected(Long quotationId) {
        Quotation quotation = findById(quotationId);
        if (!QuotationStatus.SENT.matches(quotation.getStatus())) {
            throw new IllegalArgumentException("Only SENT quotations can be rejected");
        }
        quotation.setStatus(QuotationStatus.REJECTED.getValue());
        return mapToResponse(quotationRepository.save(quotation));
    }

    public QuotationResponse getQuotationById(Long id) {
        return mapToResponse(findById(id));
    }

    /**
     * Get ALL quotations across all opportunities and companies.
     */
    public List<QuotationResponse> getAllQuotations() {
        return quotationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public PagedResponse<QuotationResponse> getAllQuotationsPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Quotation> quotePage = quotationRepository.findAllByOrderByCreatedAtDesc(pageable);
        List<QuotationResponse> content = quotePage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return PagedResponse.of(content, page, size, quotePage.getTotalElements(), quotePage.getTotalPages(), quotePage.isLast());
    }

    public List<QuotationResponse> getQuotationsForOpportunity(Long opportunityId) {
        return quotationRepository.findByOpportunityIdOrderByVersionDesc(opportunityId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<QuotationResponse> getQuotationsForCompany(Long companyId) {
        return quotationRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    // ==================== QUOTATION → ORDER CONVERSION ====================

    /**
     * Convert an accepted Quotation into an Order.
     *
     * This bridges the CRM pipeline to the existing Order pipeline:
     * - Maps QuotationItems → OrderItems
     * - Uses the Quotation's company details for customer info
     * - Sets the Opportunity's linkedOrderId
     * - The Order starts in SALES_REGISTERED status
     *
     * @param quotationId the accepted quotation to convert
     * @param adminEmail the sales admin performing the conversion
     * @return the created Order's ID
     */
    @Transactional
    public Long convertToOrder(Long quotationId, String adminEmail) {
        Quotation quotation = findById(quotationId);

        // Validate quotation is accepted
        if (!QuotationStatus.ACCEPTED.matches(quotation.getStatus())) {
            throw new IllegalArgumentException("Only ACCEPTED quotations can be converted to orders. Current status: "
                    + quotation.getStatus());
        }

        SalesCompany company = quotation.getCompany();
        if (company == null) {
            throw new IllegalArgumentException("Quotation has no linked company");
        }

        // Check if the opportunity already has a linked order
        Opportunity opp = quotation.getOpportunity();
        if (opp != null && opp.getLinkedOrderId() != null) {
            throw new IllegalArgumentException("Opportunity " + opp.getOpportunityNumber()
                    + " already has a linked order (ID: " + opp.getLinkedOrderId() + ")");
        }

        // Build the Order
        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setCustomerName(company.getName());
        order.setPiNumber(quotation.getQuoteNumber()); // Use quote number as PI reference
        order.setMobileNumber(company.getPhone() != null ? company.getPhone() : "0000000000");
        order.setExpectedDeliveryDate(LocalDate.now().plusDays(30)); // Default 30 days
        order.setTotalInvoiceAmount(quotation.getFinalAmount() != null ? quotation.getFinalAmount() : 0.0);
        order.setReceivedAmount(0.0);
        order.setPendingAmount(order.getTotalInvoiceAmount());
        order.setPriority("medium");
        order.setOrderStatus(OrderStatus.SALES_REGISTERED.getValue());
        order.setProductionStatus(ProductionStatus.CONFIRM.getValue());
        order.setPaymentStatus(PaymentStatus.PENDING.getValue());
        order.setCreatedByAdminEmail(adminEmail);

        // We need an assignedUserId — try to find a user by the company's phone or use a default
        Long assignedUserId = findOrCreateAssignedUserId(company);
        order.setAssignedUserId(assignedUserId);

        // Map QuotationItems → OrderItems
        StringBuilder productDetailsSb = new StringBuilder();
        int totalQuantity = 0;
        for (QuotationItem qi : quotation.getItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProductDetails(qi.getProductDescription());
            orderItem.setQuantity(qi.getQuantity());
            order.getOrderItems().add(orderItem);

            totalQuantity += qi.getQuantity();
            if (productDetailsSb.length() > 0) {
                productDetailsSb.append(", ");
            }
            productDetailsSb.append(qi.getProductDescription());
        }

        // Legacy fields
        order.setProductDetails(productDetailsSb.length() > 0 ? productDetailsSb.toString() : "From Quotation");
        order.setQuantity(totalQuantity > 0 ? totalQuantity : 1);

        Order savedOrder = orderRepository.save(order);

        // Link the opportunity to the order
        if (opp != null) {
            opp.setLinkedOrderId(savedOrder.getId());
            opportunityRepository.save(opp);
        }

        log.info("Quotation {} converted to Order {} by {}",
                quotation.getQuoteNumber(), savedOrder.getOrderNumber(), adminEmail);

        return savedOrder.getId();
    }

    // ==================== HELPERS ====================

    public Quotation findById(Long id) {
        return quotationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Quotation not found with ID: " + id));
    }

    private String generateQuoteNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "QT-" + datePart + "-" + randomPart;
    }

    private String generateOrderNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", (int) (Math.random() * 10000));
        return "ORD-" + datePart + "-" + randomPart;
    }

    /**
     * Find a user to assign the order to. Tries the company's phone number first,
     * then falls back to user ID 1 as a default.
     */
    private Long findOrCreateAssignedUserId(SalesCompany company) {
        if (company.getPhone() != null && !company.getPhone().isEmpty()) {
            return userRepository.findByMobile(company.getPhone())
                    .map(User::getId)
                    .orElse(1L);
        }
        return 1L; // Default user
    }

    public QuotationResponse mapToResponse(Quotation q) {
        QuotationResponse response = new QuotationResponse();
        response.setId(q.getId());
        response.setQuoteNumber(q.getQuoteNumber());
        response.setVersion(q.getVersion());
        response.setStatus(q.getStatus());
        response.setTotalAmount(q.getTotalAmount());
        response.setDiscount(q.getDiscount());
        response.setFinalAmount(q.getFinalAmount());
        response.setValidUntil(q.getValidUntil());
        response.setTermsAndConditions(q.getTermsAndConditions());
        response.setCreatedByAdminEmail(q.getCreatedByAdminEmail());
        response.setCreatedAt(q.getCreatedAt());
        response.setUpdatedAt(q.getUpdatedAt());

        if (q.getCompany() != null) {
            response.setCompanyId(q.getCompany().getId());
            response.setCompanyName(q.getCompany().getName());
        }
        if (q.getOpportunity() != null) {
            response.setOpportunityId(q.getOpportunity().getId());
            response.setOpportunityTitle(q.getOpportunity().getTitle());
        }

        if (q.getItems() != null) {
            List<QuotationResponse.QuotationItemResponse> items = q.getItems().stream()
                    .map(item -> {
                        QuotationResponse.QuotationItemResponse ir = new QuotationResponse.QuotationItemResponse();
                        ir.setId(item.getId());
                        ir.setProductId(item.getProductId());
                        ir.setProductDescription(item.getProductDescription());
                        ir.setQuantity(item.getQuantity());
                        ir.setUnitPrice(item.getUnitPrice());
                        ir.setTotalPrice(item.getTotalPrice());
                        return ir;
                    }).collect(Collectors.toList());
            response.setItems(items);
        } else {
            response.setItems(new ArrayList<>());
        }

        return response;
    }
}
