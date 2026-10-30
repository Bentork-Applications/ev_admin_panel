package com.bentork.ev_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.bentork.ev_system.dto.response.ProductResponse;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class InventoryStockResponseDTO {
    private ProductResponse product;
    private Integer availableQuantity;
}
