package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.response.CoinBalanceResponse;
import com.bentork.ev_system.model.CoinTransaction;

import java.util.List;

/**
 * Interface for coin/reward system operations.
 */
public interface ICoinService {
    void awardChargingCoins(Long userId, double energyKwh, Long sessionId);
    void awardReferralBonus(Long referrerId, Long sessionId);
    void awardReferredBonus(Long referredUserId, Long sessionId);
    double redeemCoins(Long userId, int coins, double ratePerKwh);
    CoinBalanceResponse getCoinBalance(Long userId);
    List<CoinTransaction> getCoinTransactionHistory(Long userId);
}
