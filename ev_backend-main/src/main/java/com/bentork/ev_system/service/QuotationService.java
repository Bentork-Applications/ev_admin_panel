package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateQuotationDTO;
import com.bentork.ev_system.dto.response.QuotationResponse;
import com.bentork.ev_system.enums.QuotationStatus;
import com.bentork.ev_system.model.Opportunity;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.model.Quotation;
import com.bentork.ev_system.model.QuotationItem;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.ProductRepository;
import com.bentork.ev_system.repository.QuotationRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.OpportunityRepository;

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

    public QuotationResponse markAsAccepted(Long quotationId) {
        Quotation quotation = findById(quotationId);
        if (!QuotationStatus.SENT.matches(quotation.getStatus())) {
            throw new IllegalArgumentException("Only SENT quotations can be accepted");
        }
        quotation.setStatus(QuotationStatus.ACCEPTED.getValue());
        return mapToResponse(quotationRepository.save(quotation));
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

    public List<QuotationResponse> getQuotationsForOpportunity(Long opportunityId) {
        return quotationRepository.findByOpportunityIdOrderByVersionDesc(opportunityId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<QuotationResponse> getQuotationsForCompany(Long companyId) {
        return quotationRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
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
