package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

import com.bentork.ev_system.service.interfaces.IAdminNotificationService;

import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import com.bentork.ev_system.exception.domain.ChargerNotFoundException;
import com.bentork.ev_system.exception.domain.InsufficientBalanceException;
import com.bentork.ev_system.exception.domain.RFIDCardException;
import com.bentork.ev_system.exception.domain.SessionNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.RFIDCard;
import com.bentork.ev_system.model.Revenue;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.WalletTransaction;
import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.RFIDCardRepository;
import com.bentork.ev_system.repository.RevenueRepository;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.repository.UserRepository;

import com.bentork.ev_system.service.interfaces.IRFIDChargingService;

@Slf4j
@Service
@RequiredArgsConstructor
public class RFIDChargingService implements IRFIDChargingService {

    private final RFIDCardRepository cardRepo;
    private final UserRepository userRepo;
    private final ChargerRepository chargerRepo;
    private final SessionRepository sessionRepo;
    private final IUserNotificationService notificationService;
    private final IAdminNotificationService adminNotificationService;
    private final IWalletTransactionService walletTxService;
    private final RevenueRepository revenueRepo;
    private final TaxCalculationService taxService;
    private final PushNotificationService pushNotificationService;
    private final SlotBookingService slotBookingService;

    // Start charging
    public Session startCharging(String cardNumber, Long chargerId, String boxId) {
        try {
            log.info("Starting RFID charging session: cardNumber={}, chargerId={}, boxId={}",
                    cardNumber, chargerId, boxId);

            RFIDCard card = cardRepo.findByCardNumber(cardNumber)
                    .orElseThrow(() -> RFIDCardException.invalid(cardNumber));

            if (!card.isActive()) {
                log.warn("RFID card is not active: cardNumber={}", cardNumber);
                throw RFIDCardException.inactive(cardNumber);
            }

            User user = card.getUser();
            if (user.getWalletBalance().compareTo(BigDecimal.ONE) < 0) {
                log.warn("Insufficient balance for user: userId={}, balance={}",
                        user.getId(), user.getWalletBalance());
                throw new InsufficientBalanceException(user.getId(), BigDecimal.ONE);
            }

            Charger charger = chargerRepo.findById(chargerId)
                    .orElseThrow(() -> new ChargerNotFoundException(chargerId));

            // ★ SLOT BOOKING GUARD: Block session if charger is reserved by another user
            slotBookingService.validateAndHandleBooking(user.getId(), charger.getId());

            Session session = new Session();
            session.setUser(user);
            session.setCharger(charger);
            session.setStatus(SessionStatus.ACTIVE.getValue());
            session.setStartTime(LocalDateTime.now());
            session.setEnergyKwh(0.0);
            session.setCost(0.0);
            session.setCreatedAt(LocalDateTime.now());
            session.setBoxId(boxId);
            session.setSourceType("RFID");

            Session saved = sessionRepo.save(session);

            log.info("RFID charging session started: sessionId={}, userId={}, chargerId={}, cardNumber={}",
                    saved.getId(), user.getId(), chargerId, cardNumber);

            // Notify admins about session start
            adminNotificationService.createSystemNotification(
                    "Charging session started for user " + user.getName() +
                            " on charger " + charger.getId(),
                    "Session Start");

            return saved;
        } catch (RuntimeException e) {
            log.error("Failed to start RFID charging: cardNumber={}, chargerId={}: {}",
                    cardNumber, chargerId, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to start RFID charging: cardNumber={}, chargerId={}: {}",
                    cardNumber, chargerId, e.getMessage(), e);
            throw e;
        }
    }

    // Update energy
    @CacheEvict(value = "user-data", allEntries = true)
    public Session updateEnergy(Long sessionId, BigDecimal currentKwh) {
        try {
            if (log.isDebugEnabled()) {
                log.debug("Updating energy for session: sessionId={}, currentKwh={}",
                        sessionId, currentKwh);
            }

            Session session = sessionRepo.findById(sessionId)
                    .orElseThrow(() -> new SessionNotFoundException(sessionId));

            if (!SessionStatus.ACTIVE.matches(session.getStatus()))
                return session;

            BigDecimal previous = BigDecimal.valueOf(session.getEnergyKwh());
            BigDecimal delta = currentKwh.subtract(previous);

            if (delta.compareTo(BigDecimal.ZERO) <= 0)
                return session;

            Charger charger = session.getCharger();
            BigDecimal cost = delta.multiply(BigDecimal.valueOf(charger.getRate()));

            User user = session.getUser();

            if (user.getWalletBalance().compareTo(cost) < 0) {
                log.warn(
                        "Insufficient balance during session - Auto-stopping: sessionId={}, userId={}, balance={}, requiredCost={}",
                        sessionId, user.getId(), user.getWalletBalance(), cost);

                // Notify user about insufficient balance
                notificationService.createNotification(
                        user.getId(),
                        "Charging Stopped - Low Balance",
                        "Your charging session has been stopped due to insufficient wallet balance. Please top up to continue.",
                        "WALLET");
                return stopCharging(sessionId); // auto-stop
            }

            // Deduct from wallet
            user.setWalletBalance(user.getWalletBalance().subtract(cost));

            // Update session data
            session.setEnergyKwh(currentKwh.doubleValue());
            session.setCost(session.getCost() + cost.doubleValue());

            userRepo.save(user);
            Session updated = sessionRepo.save(session);

            log.info("Energy updated for session: sessionId={}, energy={}, totalCost={}, walletBalance={}",
                    sessionId, currentKwh, updated.getCost(), user.getWalletBalance());

            return updated;
        } catch (Exception e) {
            log.error("Failed to update energy: sessionId={}, currentKwh={}: {}",
                    sessionId, currentKwh, e.getMessage(), e);
            throw e;
        }
    }

    // Stop charging
    @CacheEvict(value = "user-data", allEntries = true)
    public Session stopCharging(Long sessionId) {
        try {
            log.info("Stopping charging session: sessionId={}", sessionId);

            Session session = sessionRepo.findById(sessionId)
                    .orElseThrow(() -> new SessionNotFoundException(sessionId));

            if (!SessionStatus.ACTIVE.matches(session.getStatus())) {
                log.warn("Session is not active, cannot stop: sessionId={}, status={}",
                        sessionId, session.getStatus());
                return session;
            }

            session.setStatus(SessionStatus.COMPLETED.getValue());
            session.setEndTime(LocalDateTime.now());

            log.info("Relay OFF → Charger {}", session.getCharger().getId());

            Session saved = sessionRepo.save(session);

            // 🔹 Final cost including platform fee (floored-unit logic) and PST
            BigDecimal platformFee = taxService.calculatePlatformFee(
                    saved.getEnergyKwh(), saved.getCharger().getPlatformFeePerKwh());
            BigDecimal subtotal = BigDecimal.valueOf(saved.getCost()).add(platformFee);
            
            BigDecimal pst = taxService.calculatePst(saved.getEnergyKwh(), saved.getCharger().getRate(), saved.getCharger().getPstPercent());
            BigDecimal finalCost = subtotal.add(pst);
            
            saved.setCost(finalCost.doubleValue());
            saved.setPlatformFee(platformFee.doubleValue());
            saved.setPstAmount(pst.doubleValue());
            sessionRepo.save(saved);

            // === FCM: Dismiss progress bar — RFID session completed ===
            try {
                if (saved.getUser() != null && saved.getUser().getFcmToken() != null) {
                    pushNotificationService.sendDataOnlyNotification(
                        saved.getUser().getFcmToken(),
                        Map.of(
                            "type",       "SESSION_COMPLETED",
                            "sessionId",  String.valueOf(saved.getId()),
                            "energyKwh",  String.valueOf(saved.getEnergyKwh()),
                            "finalCost",  String.valueOf(saved.getCost()),
                            "status",     "COMPLETED"
                        )
                    );
                }
            } catch (Exception fcmEx) {
                log.error("Failed to send session-completed FCM for RFID session {}: {}",
                        saved.getId(), fcmEx.getMessage());
            }

            if (finalCost.compareTo(BigDecimal.ZERO) > 0) {
                log.info("Processing payment for session: sessionId={}, finalCost={}, platformFee={}, pst={}",
                        sessionId, finalCost, platformFee, pst);

                // 1. Wallet debit
                WalletTransaction tx = walletTxService.debit(
                        saved.getUser().getId(),
                        saved.getId(),
                        BigDecimal.valueOf(saved.getCost()),
                        "Wallet");

                // 2. Add to revenue
                Revenue revenue = new Revenue();
                revenue.setSession(saved);
                revenue.setUser(saved.getUser());
                revenue.setCharger(saved.getCharger());
                revenue.setStation(saved.getCharger().getStation()); // assuming Charger → Station mapping
                revenue.setAmount(saved.getCost());
                revenue.setPaymentMethod("Wallet");
                revenue.setTransactionId(tx.getTransactionRef()); // use WalletTransaction reference
                revenue.setPaymentStatus("success");

                revenueRepo.save(revenue);

                log.info("Revenue recorded for session: sessionId={}, amount={}, transactionId={}",
                        sessionId, finalCost, tx.getTransactionRef());
            }

            log.info(
                    "Charging session completed: sessionId={}, userId={}, totalEnergy={}, totalCost={}, duration={} minutes",
                    saved.getId(), saved.getUser().getId(), saved.getEnergyKwh(),
                    saved.getCost(), java.time.Duration.between(saved.getStartTime(), saved.getEndTime()).toMinutes());

            // Notify admins
            adminNotificationService.createSystemNotification(
                    "Charging session completed for User " + saved.getUser().getName() +
                            ". Total cost: ₹" + saved.getCost(),
                    "Session End");

            return saved;
        } catch (Exception e) {
            log.error("Failed to stop charging session: sessionId={}: {}",
                    sessionId, e.getMessage(), e);
            throw e;
        }
    }

    public boolean validateRFIDCard(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) {
            log.warn("RFID card validation failed - Card number is null or empty");
            return false;
        }

        try {
            RFIDCard card = cardRepo.findByCardNumber(cardNumber).orElse(null);
            if (card == null) {
                log.warn("RFID card validation failed - Card not found: cardNumber={}", cardNumber);
                return false;
            }
            if (!card.isActive()) {
                log.warn("RFID card validation failed - Card not active: cardNumber={}", cardNumber);
                return false;
            }

            User user = card.getUser();
            if (user.getWalletBalance().compareTo(BigDecimal.ONE) < 0) {
                log.warn("RFID card validation failed - Insufficient balance: cardNumber={}, userId={}, balance={}",
                        cardNumber, user.getId(), user.getWalletBalance());
                return false;
            }

            if (log.isDebugEnabled()) {
                log.debug("RFID card validated successfully: cardNumber={}, userId={}",
                        cardNumber, user.getId());
            }
            return true;
        } catch (Exception e) {
            log.error("RFID card validation error: cardNumber={}: {}",
                    cardNumber, e.getMessage(), e);
            return false;
        }
    }
}