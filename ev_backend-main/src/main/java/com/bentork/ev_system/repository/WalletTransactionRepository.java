package com.bentork.ev_system.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.bentork.ev_system.model.WalletTransaction;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findByUserId(Long userId);

    Optional<WalletTransaction> findTopByUserIdAndAmountAndSessionIdIsNullOrderByCreatedAtDesc(
            Long userId,
            BigDecimal amount);

    // Fetch all for a user (supports "limit 10" via Pageable)
    Page<WalletTransaction> findByUserId(Long userId, Pageable pageable);

    // Fetch specific type (credit/debit) for a user
    Page<WalletTransaction> findByUserIdAndType(Long userId, String type, Pageable pageable);
}
