package com.bentork.ev_system.service.billing;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Encapsulates the result of a billing calculation.
 * Replaces scattered local variables across the finalization logic.
 */
@Data
public class BillingResult {
    private BigDecimal finalCost;
    private BigDecimal platformFee;      // platform fee applied to this session
    private BigDecimal pstAmount;        // PST applied to this session
    private BigDecimal prepaidAmount;
    private BigDecimal refundAmount;    // null if no refund
    private BigDecimal extraDebit;      // null if no extra charge
    private boolean refundIssued;
    private boolean extraDebited;
    private String description;
}
