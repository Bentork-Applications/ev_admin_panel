package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class ScmItemDTO {

    @NotNull(message = "Order item ID is required")
    private Long orderItemId;

    @NotEmpty(message = "At least one barcode is required per item")
    private List<String> barcodes;

    @NotNull(message = "Service warranty (months) is required")
    @Min(value = 0, message = "Service warranty must be 0 or more months")
    private Integer serviceWarrantyMonths;

    @NotNull(message = "Full warranty (months) is required")
    @Min(value = 0, message = "Full warranty must be 0 or more months")
    private Integer fullWarrantyMonths;

    // Getters and Setters

    public Long getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(Long orderItemId) {
        this.orderItemId = orderItemId;
    }

    public List<String> getBarcodes() {
        return barcodes;
    }

    public void setBarcodes(List<String> barcodes) {
        this.barcodes = barcodes;
    }

    public Integer getServiceWarrantyMonths() {
        return serviceWarrantyMonths;
    }

    public void setServiceWarrantyMonths(Integer serviceWarrantyMonths) {
        this.serviceWarrantyMonths = serviceWarrantyMonths;
    }

    public Integer getFullWarrantyMonths() {
        return fullWarrantyMonths;
    }

    public void setFullWarrantyMonths(Integer fullWarrantyMonths) {
        this.fullWarrantyMonths = fullWarrantyMonths;
    }
}
