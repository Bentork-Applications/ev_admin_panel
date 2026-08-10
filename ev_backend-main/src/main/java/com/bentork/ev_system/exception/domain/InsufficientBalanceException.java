package com.bentork.ev_system.exception.domain;

import java.math.BigDecimal;

public class InsufficientBalanceException extends RuntimeException {

    public InsufficientBalanceException(Long userId, BigDecimal required) {
        super("Insufficient wallet balance for user " + userId
                + ". Required: ₹" + required);
    }
}
