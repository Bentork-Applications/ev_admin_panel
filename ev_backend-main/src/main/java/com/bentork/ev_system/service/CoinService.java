package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.IWalletTransactionService;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.response.CoinBalanceResponse;
import com.bentork.ev_system.model.CoinTransaction;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.CoinTransactionRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import com.bentork.ev_system.exception.domain.UserNotFoundException;

import com.bentork.ev_system.service.interfaces.ICoinService;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoinService implements ICoinService {

    // === Constants ===
    public static final int COINS_PER_KWH = 5;
    public static final int REFERRAL_BONUS = 250;
    public static final int REFERRED_BONUS = 50;
    public static final int COINS_TO_REDEEM_1_KWH = 1000;

    private final CoinTransactionRepository coinTransactionRepo;

    private final UserRepository userRepo;

    private final IWalletTransactionService walletTransactionService;

    /**
     * Award coins for charging session completion.
     * Formula: floor(energyKwh) * COINS_PER_KWH
     */
    @Transactional
    @CacheEvict(value = "user-data", allEntries = true)
    public void awardChargingCoins(Long userId, double energyKwh, Long sessionId) {
        int kwhFloor = (int) Math.floor(energyKwh);
        if (kwhFloor <= 0) {
            log.debug("No coins to award: energyKwh={} is less than 1", energyKwh);
            return;
        }

        int coins = kwhFloor * COINS_PER_KWH;

        User user = userRepo.findByIdWithLock(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        user.setCoinBalance(user.getCoinBalance() + coins);
        userRepo.save(user);

        CoinTransaction tx = new CoinTransaction();
        tx.setUserId(userId);
        tx.setAmount(coins);
        tx.setType("CHARGING_REWARD");
        tx.setDescription("Earned " + coins + " coins for charging " + String.format("%.2f", energyKwh) + " kWh");
        tx.setSessionId(sessionId);
        coinTransactionRepo.save(tx);

        log.info("Awarded {} charging coins to userId={}, sessionId={}, energyKwh={}",
                coins, userId, sessionId, energyKwh);
    }

    /**
     * Award referral bonus to the referrer (250 coins).
     */
    @Transactional
    @CacheEvict(value = "user-data", allEntries = true)
    public void awardReferralBonus(Long referrerId, Long sessionId) {
        User user = userRepo.findByIdWithLock(referrerId)
                .orElseThrow(() -> new UserNotFoundException(referrerId));

        user.setCoinBalance(user.getCoinBalance() + REFERRAL_BONUS);
        userRepo.save(user);

        CoinTransaction tx = new CoinTransaction();
        tx.setUserId(referrerId);
        tx.setAmount(REFERRAL_BONUS);
        tx.setType("REFERRAL_BONUS");
        tx.setDescription("Earned " + REFERRAL_BONUS + " coins for referring a friend");
        tx.setSessionId(sessionId);
        coinTransactionRepo.save(tx);

        log.info("Awarded {} referral bonus coins to referrerId={}", REFERRAL_BONUS, referrerId);
    }

    /**
     * Award referred friend bonus (50 coins).
     */
    @Transactional
    @CacheEvict(value = "user-data", allEntries = true)
    public void awardReferredBonus(Long referredUserId, Long sessionId) {
        User user = userRepo.findByIdWithLock(referredUserId)
                .orElseThrow(() -> new UserNotFoundException(referredUserId));

        user.setCoinBalance(user.getCoinBalance() + REFERRED_BONUS);
        userRepo.save(user);

        CoinTransaction tx = new CoinTransaction();
        tx.setUserId(referredUserId);
        tx.setAmount(REFERRED_BONUS);
        tx.setType("REFERRED_BONUS");
        tx.setDescription("Earned " + REFERRED_BONUS + " coins as referral welcome bonus");
        tx.setSessionId(sessionId);
        coinTransactionRepo.save(tx);

        log.info("Awarded {} referred bonus coins to userId={}", REFERRED_BONUS, referredUserId);
    }

    /**
     * Redeem coins for wallet credit.
     * 1000 coins = 1 kWh. Coins must be a multiple of 1000.
     * Credits the ₹ equivalent to user's wallet.
     *
     * @param userId     User redeeming coins
     * @param coins      Number of coins to redeem (must be multiple of 1000)
     * @param ratePerKwh Current charger rate (₹ per kWh) - passed by controller or
     *                   uses default
     * @return The kWh value redeemed
     */
    @Transactional
    @CacheEvict(value = "user-data", allEntries = true)
    public double redeemCoins(Long userId, int coins, double ratePerKwh) {
        if (coins <= 0 || coins % COINS_TO_REDEEM_1_KWH != 0) {
            throw new RuntimeException("Coins must be a positive multiple of " + COINS_TO_REDEEM_1_KWH);
        }

        User user = userRepo.findByIdWithLock(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (user.getCoinBalance() < coins) {
            throw new RuntimeException("Insufficient coin balance. You have "
                    + user.getCoinBalance() + " coins, but need " + coins);
        }

        // Calculate kWh and monetary value
        double kwhRedeemed = (double) coins / COINS_TO_REDEEM_1_KWH;
        BigDecimal walletCredit = BigDecimal.valueOf(kwhRedeemed * ratePerKwh)
                .setScale(2, java.math.RoundingMode.HALF_UP);

        // Deduct coins
        user.setCoinBalance(user.getCoinBalance() - coins);
        userRepo.save(user);

        // Log coin transaction
        CoinTransaction tx = new CoinTransaction();
        tx.setUserId(userId);
        tx.setAmount(-coins);
        tx.setType("REDEMPTION");
        tx.setDescription("Redeemed " + coins + " coins for " + String.format("%.2f", kwhRedeemed)
                + " kWh (₹" + walletCredit + " credited to wallet)");
        coinTransactionRepo.save(tx);

        // Credit wallet
        walletTransactionService.credit(userId, null, walletCredit, "Coin Redemption");

        log.info("Redeemed {} coins for userId={}: {} kWh = ₹{}", coins, userId, kwhRedeemed, walletCredit);

        return kwhRedeemed;
    }

    /**
     * Get user's coin balance and redeemable kWh.
     */
    @Cacheable(value = "user-data", key = "'coin-balance-' + #userId")
    public CoinBalanceResponse getCoinBalance(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        int balance = user.getCoinBalance();
        double redeemableKwh = (double) balance / COINS_TO_REDEEM_1_KWH;

        return new CoinBalanceResponse(balance, redeemableKwh);
    }

    /**
     * Get coin transaction history for a user.
     */
    public List<CoinTransaction> getCoinTransactionHistory(Long userId) {
        return coinTransactionRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
