package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaterialInRequestDTO {

    @NotNull(message = "Purchase Order ID is required")
    private Long purchaseOrderId;
    
    private String vendorInvoiceNumber;
    
    private String notes;
    
    @NotEmpty(message = "At least one item must be received")
    @Valid
    private List<MaterialInItemRequestDTO> items;
}
