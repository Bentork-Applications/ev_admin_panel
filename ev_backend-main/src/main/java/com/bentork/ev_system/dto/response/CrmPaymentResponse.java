package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class CrmPaymentResponse {

    private Long orderId;
    private String orderNumber;
    private Double amountPaid;
    private Double totalInvoiceAmount;
    private Double receivedAmount;
    private Double pendingAmount;
    private String paymentStatus;
    private String paymentMethod;
    private String referenceNumber;
    private String recordedByAdminEmail;
    private LocalDateTime recordedAt;
}
