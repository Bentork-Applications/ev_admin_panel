package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.WalletTransaction;

import java.math.BigDecimal;
import java.util.List;

/**
 * Interface for wallet transaction operations (credit, debit, balance).
 */
public interface IWalletTransactionService {
    List<WalletTransaction> getTransactionHistory(Long userId, String type, boolean viewAll);
    WalletTransaction save(WalletTransaction tx);
    boolean hasBalance(Long userId, BigDecimal amount);
    BigDecimal getBalance(Long userId);
    WalletTransaction debit(Long userId, Long sessionId, BigDecimal amount, String method);
    void updateSessionIdForUser(Long userId, BigDecimal amount, Long sessionId);
    WalletTransaction credit(Long userId, Long sessionId, BigDecimal amount, String method);
}
