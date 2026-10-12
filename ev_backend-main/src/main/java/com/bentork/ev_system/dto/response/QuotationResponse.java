package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuotationResponse {

    private Long id;
    private String quoteNumber;
    private Long opportunityId;
    private String opportunityTitle;
    private Long companyId;
    private String companyName;
    private Integer version;
    private String status;
    private Double totalAmount;
    private Double discount;
    private Double finalAmount;
    private LocalDate validUntil;
    private String termsAndConditions;
    private List<QuotationItemResponse> items;
    private String createdByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    public static class QuotationItemResponse {
        private Long id;
        private Long productId;
        private String productDescription;
        private Integer quantity;
        private Double unitPrice;
        private Double totalPrice;
    }
}
