package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CrmRecordPaymentDTO {

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
    private Double amount;

    private String paymentMethod; // e.g., "bank_transfer", "upi", "cheque", "cash"

    private String referenceNumber; // Transaction/cheque reference

    private String notes;
}
