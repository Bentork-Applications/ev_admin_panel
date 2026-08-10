package com.bentork.ev_system.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class UpdateScmDetailsDTO {

    @NotBlank(message = "Invoice number is required")
    private String invoiceNumber;

    @NotBlank(message = "Tracking ID is required")
    private String trackingId;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<ScmItemDTO> items;

    // Getters and Setters

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getTrackingId() {
        return trackingId;
    }

    public void setTrackingId(String trackingId) {
        this.trackingId = trackingId;
    }

    public List<ScmItemDTO> getItems() {
        return items;
    }

    public void setItems(List<ScmItemDTO> items) {
        this.items = items;
    }
}
