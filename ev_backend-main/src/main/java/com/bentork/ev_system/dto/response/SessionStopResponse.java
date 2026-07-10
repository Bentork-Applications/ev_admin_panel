package com.bentork.ev_system.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Typed response DTO for session stop/finalization operations.
 * Replaces Map<String, Object> for type safety.
 */
@Data
public class SessionStopResponse {
    private Long sessionId;
    private double energyUsed;
    private BigDecimal finalCost;
    private boolean refundIssued;
    private boolean extraDebited;
    private String message;
}
