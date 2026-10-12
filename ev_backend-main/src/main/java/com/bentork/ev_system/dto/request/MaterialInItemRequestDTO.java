package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaterialInItemRequestDTO {

    @NotNull(message = "Purchase Order Item ID is required")
    private Long poItemId;
    
    @NotNull(message = "Received quantity is required")
    @Min(value = 1, message = "Received quantity must be greater than zero")
    private Integer receivedQuantity;
}
