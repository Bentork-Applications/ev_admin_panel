package com.bentork.ev_system.dto.response;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Typed response DTO for session start operations.
 * Replaces Map<String, Object> for type safety.
 */
@Data
public class SessionStartResponse {
    private Long receiptId;
    private Long sessionId;
    private BigDecimal amountDebited;
    private String message;
}
