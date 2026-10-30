package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MaterialInResponseDTO {
    private Long id;
    private String receiptNumber;
    private Long purchaseOrderId;
    private String poNumber;
    private String vendorInvoiceNumber;
    private LocalDate receivedDate;
    private String receivedByEmail;
    private String notes;
    private LocalDateTime createdAt;
}
