package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Revenue data to avoid Hibernate proxy serialization issues
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueDTO {
    private Long id;
    private Double amount;
    private String paymentMethod;
    private String transactionId;
    private String paymentStatus;
    private LocalDateTime createdAt;

    // Related entity IDs only (not full objects)
    private Long sessionId;
    private Long userId;
    private Long chargerId;
    private Long stationId;

    // Optional names for display
    private String stationName;
    private String userName;
}
