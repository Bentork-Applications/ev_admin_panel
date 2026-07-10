package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import com.bentork.ev_system.service.interfaces.ISessionService;

import com.bentork.ev_system.service.interfaces.IMaintenanceService;
import com.bentork.ev_system.exception.domain.StationUnderMaintenanceException;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Plan;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.ReceiptRepository;

import com.bentork.ev_system.exception.domain.InsufficientBalanceException;
import com.bentork.ev_system.exception.domain.ReceiptNotFoundException;

import com.bentork.ev_system.service.interfaces.IReceiptService;

@Service
public class ReceiptService implements IReceiptService {

    private final ReceiptRepository receiptRepository;
    private final IWalletTransactionService walletTransactionService;
    private final IUserNotificationService userNotificationService;
    private final ISessionService sessionService;
    private final IMaintenanceService maintenanceService;
    private final TaxCalculationService taxService;

    public ReceiptService(
            ReceiptRepository receiptRepository,
            IWalletTransactionService walletTransactionService,
            IUserNotificationService userNotificationService,
            @Lazy ISessionService sessionService,
            IMaintenanceService maintenanceService,
            TaxCalculationService taxService) {
        this.receiptRepository = receiptRepository;
        this.walletTransactionService = walletTransactionService;
        this.userNotificationService = userNotificationService;
        this.sessionService = sessionService;
        this.maintenanceService = maintenanceService;
        this.taxService = taxService;
    }

    /**
     * Creates a new receipt (PENDING) for a kWh package/custom.
     */
    @Transactional
    public Receipt createReceipt(User user, Charger charger, BigDecimal selectedKwh) {
        // ★ MAINTENANCE GUARD: Block receipt creation if charger is under maintenance
        if (maintenanceService.isChargerUnderMaintenance(charger.getId())) {
            throw new StationUnderMaintenanceException(charger.getId(), "charger");
        }

        Receipt receipt = new Receipt();
        receipt.setUser(user);
        receipt.setCharger(charger);

        BigDecimal energyCost = selectedKwh.multiply(BigDecimal.valueOf(charger.getRate()));
        BigDecimal platformFee = taxService.calculatePlatformFee(
                selectedKwh.doubleValue(), charger.getPlatformFeePerKwh());
        
        BigDecimal subtotal = energyCost.add(platformFee);
        BigDecimal pst = taxService.calculatePst(selectedKwh.doubleValue(), charger.getRate(), charger.getPstPercent());
        
        BigDecimal amount = subtotal.add(pst);
        receipt.setSelectedKwh(selectedKwh);
        receipt.setSessionType("CUSTOM");

        receipt.setAmount(amount);
        receipt.setStatus("Pending");
        receipt.setCreatedAt(LocalDateTime.now());
        return receiptRepository.save(receipt);
    }

    /**
     * Creates a new receipt for a MONEY_BASED session.
     */
    @Transactional
    public Receipt createMoneyBasedReceipt(User user, Charger charger, BigDecimal amountEntered, 
                                           com.bentork.ev_system.service.MoneyCalculationService.MoneyCalculationResult calc) {
        if (maintenanceService.isChargerUnderMaintenance(charger.getId())) {
            throw new StationUnderMaintenanceException(charger.getId(), "charger");
        }

        Receipt receipt = new Receipt();
        receipt.setUser(user);
        receipt.setCharger(charger);
        
        // Debit the chargeable amount (instant refund handles the remainder)
        receipt.setAmount(amountEntered);
        receipt.setSelectedKwh(calc.getAllocatedKwh());
        receipt.setSessionType("MONEY_BASED");

        receipt.setStatus("Pending");
        receipt.setCreatedAt(LocalDateTime.now());
        return receiptRepository.save(receipt);
    }

    /**
     * Debits wallet, marks receipt PAID, and starts session.
     * If charger fails to start → refund & notify user.
     *
     * @Transactional ensures wallet debit + session creation are atomic.
     *                If session creation fails, the wallet debit is rolled back.
     */
    @Transactional
    public Receipt payReceipt(Long receiptId, String boxId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new ReceiptNotFoundException(receiptId));

        Long userId = receipt.getUser().getId();
        BigDecimal amount = receipt.getAmount();

        // ✅ Wallet balance check
        if (!walletTransactionService.hasBalance(userId, amount)) {
            userNotificationService.createNotification(
                    userId,
                    "Insufficient Wallet Balance",
                    "You need ₹" + amount + " but your wallet balance is too low. Please top-up.",
                    "Wallet Error");
            throw new InsufficientBalanceException(userId, amount);
        }

        // Debit wallet
        walletTransactionService.debit(userId, null, amount, "Charging Payment");
        receipt.setStatus("PAID");
        receipt.setUpdatedAt(LocalDateTime.now());
        receiptRepository.save(receipt);

        // Start session
        Session session = sessionService.startSessionFromReceipt(receipt, boxId);
        receipt.setSession(session);
        walletTransactionService.updateSessionIdForUser(userId, amount, session.getId());

        // NOTE: If session fails, handleOfflineSession() in SessionService already
        // issues
        // the refund and throws an exception. We only update receipt status here if
        // somehow
        // a failed session returns without exception.
        if ("failed".equalsIgnoreCase(session.getStatus())) {
            receipt.setStatus("Refunded");
            // Refund is already handled by SessionService.handleOfflineSession() - no
            // duplicate refund needed
        }

        return receiptRepository.save(receipt);
    }

    /**
     * Finalizes receipt after session ends.
     */
    public void finalizeReceipt(Session session, BigDecimal finalCost) {
        Receipt receipt = receiptRepository.findBySession(session)
                .orElseThrow(() -> new RuntimeException("Linked receipt not found"));

        receipt.setAmount(finalCost);
        receipt.setStatus("Finalize");
        receipt.setUpdatedAt(LocalDateTime.now());
        receiptRepository.save(receipt);
    }

    public Receipt save(Receipt receipt) {
        return receiptRepository.save(receipt);
    }
}
