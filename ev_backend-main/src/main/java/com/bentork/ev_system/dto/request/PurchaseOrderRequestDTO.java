package com.bentork.ev_system.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseOrderRequestDTO {

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;
    
    private LocalDate expectedDeliveryDate;
    private String deliveryLocation;
    private String termsAndConditions;
    
    @NotEmpty(message = "Order must have at least one item")
    @Valid
    private List<PurchaseOrderItemRequestDTO> items;
}
