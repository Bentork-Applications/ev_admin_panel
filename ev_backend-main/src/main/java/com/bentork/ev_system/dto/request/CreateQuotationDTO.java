package com.bentork.ev_system.dto.request;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateQuotationDTO {

    private Long opportunityId;
    private Long companyId;
    private Double discount;
    private String validUntil; // yyyy-MM-dd
    private String termsAndConditions;
    private List<QuotationLineItemDTO> items;

    @Getter
    @Setter
    public static class QuotationLineItemDTO {
        private Long productId;
        private String productDescription;
        private Integer quantity;
        private Double unitPrice;
    }
}
