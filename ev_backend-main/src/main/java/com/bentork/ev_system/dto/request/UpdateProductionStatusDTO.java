package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UpdateProductionStatusDTO {

    @NotBlank(message = "Production status is required")
    @Pattern(regexp = "^(confirm|in_progress|testing|completed)$", message = "Production status must be 'confirm', 'in_progress', 'testing', or 'completed'")
    private String productionStatus;

    // Getters and Setters

    public String getProductionStatus() {
        return productionStatus;
    }

    public void setProductionStatus(String productionStatus) {
        this.productionStatus = productionStatus;
    }
}
