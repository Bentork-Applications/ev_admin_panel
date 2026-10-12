package com.bentork.ev_system.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.WalletTransaction;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.repository.WalletTransactionRepository;

import com.bentork.ev_system.exception.domain.InsufficientBalanceException;
import com.bentork.ev_system.exception.domain.UserNotFoundException;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletTransactionService implements IWalletTransactionService {

    private final WalletTransactionRepository repo;

    private final UserRepository userRepo;

    private final TaxCalculationService taxService;

    public List<WalletTransaction> getTransactionHistory(Long userId, String type, boolean viewAll) {
        Sort sort = Sort.by("createdAt").descending();

        // If viewAll is true, get UNPAGED list. If false, get page 0 with 10 items.
        Pageable pageable = viewAll ? Pageable.unpaged() : PageRequest.of(0, 10, sort);

        if (type != null && !type.isEmpty()) {
            return repo.findByUserIdAndType(userId, type, pageable).getContent();
        } else {
            return repo.findByUserId(userId, pageable).getContent();
        }
    }

    /**
     * Save a WalletTransaction and update user's wallet balance if the transaction
     * status is "success".
     * 
     * FIXED: Uses pessimistic locking to prevent race conditions.
     * This method is transactional and uses findByIdWithLock to ensure atomic
     * updates.
     */
    @CacheEvict(value = "user-data", allEntries = true)
    @Transactional
    public WalletTransaction save(WalletTransaction tx) {
        WalletTransaction saved = repo.save(tx);

        if ("success".equalsIgnoreCase(saved.getStatus())) {
            // Use pessimistic lock to prevent race conditions
            userRepo.findByIdWithLock(saved.getUserId()).ifPresent(user -> {
                BigDecimal balance = user.getWalletBalance() != null ? user.getWalletBalance()
                        : BigDecimal.ZERO;

                if ("credit".equalsIgnoreCase(saved.getType())) {
                    user.setWalletBalance(balance.add(saved.getAmount()));
                    log.debug("Credited {} to user {}, new balance: {}",
                            saved.getAmount(), user.getId(), user.getWalletBalance());
                } else {
                    user.setWalletBalance(balance.subtract(saved.getAmount()));
                    log.debug("Debited {} from user {}, new balance: {}",
                            saved.getAmount(), user.getId(), user.getWalletBalance());
                }
                userRepo.save(user);
            });
        }

        return saved;
    }

    /**
     * Check whether a user has at least `amount` in wallet.
     * 
     * FIXED: Uses pessimistic lock to get accurate balance during checks
     * that will be followed by debit operations.
     */
    @Transactional
    public boolean hasBalance(Long userId, BigDecimal amount) {
        if (amount == null)
            return true; // treat null as no-check

        // Use lock to ensure balance doesn't change between check and debit
        Optional<User> userOpt = userRepo.findByIdWithLock(userId);
        return userOpt.map(u -> {
            BigDecimal balance = u.getWalletBalance() != null ? u.getWalletBalance()
                    : BigDecimal.ZERO;
            return balance.compareTo(amount) >= 0;
        }).orElse(false);
    }

    /**
     * Return user's current wallet balance (or ZERO if user not found / null).
     */
    public BigDecimal getBalance(Long userId) {
        return userRepo.findById(userId)
                .map(u -> u.getWalletBalance() != null ? u.getWalletBalance() : BigDecimal.ZERO)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * Create and save a debit transaction. Throws RuntimeException when balance is
     * insufficient.
     * sessionId is optional and used only to include in transactionRef for tracing.
     * 
     * FIXED: Entire operation is transactional with pessimistic locking.
     * Balance check and debit are atomic.
     */
    @CacheEvict(value = "user-data", allEntries = true)
    @Transactional
    public WalletTransaction debit(Long userId, Long sessionId, BigDecimal amount, String method) {
        if (amount == null)
            throw new IllegalArgumentException("amount cannot be null");
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("amount must be positive");

        // Lock user row and check balance atomically
        User user = userRepo.findByIdWithLock(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        BigDecimal balance = user.getWalletBalance() != null ? user.getWalletBalance() : BigDecimal.ZERO;

        if (balance.compareTo(amount) < 0) {
            log.warn("Insufficient balance for debit: userId={}, balance={}, requested={}",
                    userId, balance, amount);
            throw new InsufficientBalanceException(userId, amount);
        }

        // Debit directly while holding lock
        user.setWalletBalance(balance.subtract(amount));
        userRepo.save(user);

        log.info("Wallet debit: userId={}, amount={}, newBalance={}, sessionId={}",
                userId, amount, user.getWalletBalance(), sessionId);

        // Create transaction record (status is success since we already debited)
        WalletTransaction tx = new WalletTransaction();
        tx.setUserId(userId);
        tx.setSessionId(sessionId);
        tx.setAmount(amount);
        tx.setType("debit");
        tx.setMethod(method != null ? method : "debit");
        tx.setStatus("success");
        tx.setTransactionRef((sessionId != null ? "sess-" + sessionId + "-" : "") + UUID.randomUUID().toString());

        return repo.save(tx);
    }



    @Transactional
    public void updateSessionIdForUser(Long userId, BigDecimal amount, Long sessionId) {
        // Get the last wallet transaction for this user that matches amount and has no
        // sessionId
        WalletTransaction tx = repo.findTopByUserIdAndAmountAndSessionIdIsNullOrderByCreatedAtDesc(userId, amount)
                .orElseThrow(() -> new RuntimeException("No matching wallet transaction found to attach sessionId"));
        tx.setSessionId(sessionId);
        repo.save(tx);
    }

    @CacheEvict(value = "user-data", allEntries = true)
    @Transactional
    public WalletTransaction credit(Long userId, Long sessionId, BigDecimal amount, String method) {

        if (amount == null)
            throw new IllegalArgumentException("amount cannot be null");

        BigDecimal gst = BigDecimal.ZERO;
        BigDecimal pst = BigDecimal.ZERO; // PST removed from wallet top-ups
        BigDecimal netAmount = amount;

        // APPLY TAX ONLY FOR WALLET TOP-UP
        if (sessionId == null && "TOPUP".equalsIgnoreCase(method)) {

            gst = taxService.calculateGst(amount);
            // PST is no longer applied to wallet top-ups

            netAmount = amount.subtract(gst);
        }

        WalletTransaction tx = new WalletTransaction();
        tx.setUserId(userId);
        tx.setSessionId(sessionId);
        tx.setGrossAmount(amount);
        tx.setGstAmount(gst);
        tx.setPstAmount(pst);
        tx.setAmount(netAmount); // WALLET CREDIT
        tx.setType("credit");
        tx.setMethod(method);
        tx.setStatus("success");
        tx.setTransactionRef(UUID.randomUUID().toString());

        return save(tx);
    }

}
