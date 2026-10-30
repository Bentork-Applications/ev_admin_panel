package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseOrderResponseDTO {
    private Long id;
    private String poNumber;
    private VendorResponseDTO vendor;
    private String status;
    private LocalDate expectedDeliveryDate;
    private String deliveryLocation;
    private String termsAndConditions;
    private String createdByEmail;
    private String approvedByEmail;
    private LocalDateTime createdAt;
    private List<PurchaseOrderItemResponseDTO> items;
}
