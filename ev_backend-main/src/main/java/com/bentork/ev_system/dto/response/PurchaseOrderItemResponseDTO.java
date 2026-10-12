package com.bentork.ev_system.dto.response;

import lombok.Getter;
import lombok.Setter;
import com.bentork.ev_system.dto.response.ProductResponse;

@Getter
@Setter
public class PurchaseOrderItemResponseDTO {
    private Long id;
    private ProductResponse product;
    private Integer quantity;
    private Integer receivedQuantity;
}
