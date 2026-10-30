package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.ICoinService;

import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.response.ReferralInfoResponse;
import com.bentork.ev_system.enums.ReferralStatus;
import com.bentork.ev_system.model.Referral;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.ReferralRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReferralService {

    private static final String REFERRAL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int REFERRAL_CODE_LENGTH = 8;
    private static final SecureRandom random = new SecureRandom();

    private final UserRepository userRepo;

    private final ReferralRepository referralRepo;

    private final ICoinService coinService;

    private final IUserNotificationService userNotificationService;

    /**
     * Get or generate a unique referral code for the user.
     */
    @Transactional
    public String getOrGenerateReferralCode(Long userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (user.getReferralCode() != null && !user.getReferralCode().isEmpty()) {
            return user.getReferralCode();
        }

        // Generate unique 8-char code
        String code;
        int attempts = 0;
        do {
            code = generateRandomCode();
            attempts++;
            if (attempts > 100) {
                throw new RuntimeException("Failed to generate unique referral code after 100 attempts");
            }
        } while (userRepo.existsByReferralCode(code));

        user.setReferralCode(code);
        userRepo.save(user);

        log.info("Generated referral code '{}' for userId={}", code, userId);
        return code;
    }

    /**
     * Apply a referral code (entered from wallet section).
     * Creates a PENDING referral record.
     */
    @Transactional
    public void applyReferralCode(Long userId, String referralCode) {
        // Check if user already applied a referral code
        if (referralRepo.existsByReferredUserId(userId)) {
            throw new RuntimeException("You have already applied a referral code");
        }

        // Find the referrer by code
        User referrer = userRepo.findByReferralCode(referralCode.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Invalid referral code: " + referralCode));

        // Prevent self-referral
        if (referrer.getId().equals(userId)) {
            throw new RuntimeException("You cannot use your own referral code");
        }

        // Create PENDING referral
        Referral referral = new Referral();
        referral.setReferrerId(referrer.getId());
        referral.setReferredUserId(userId);
        referral.setStatus(ReferralStatus.PENDING.getValue());
        referralRepo.save(referral);

        log.info("Referral applied: referrerId={}, referredUserId={}, code={}",
                referrer.getId(), userId, referralCode);

        // Notify referrer
        userNotificationService.createNotification(
                referrer.getId(),
                "New Referral",
                "Someone used your referral code! You'll earn " + CoinService.REFERRAL_BONUS
                        + " coins when they complete their first charging session.",
                "INFO");
    }

    /**
     * Process first session completion — award referral bonuses if applicable.
     * Called from SessionService.finalizeSession().
     */
    @Transactional
    public void processFirstSessionCompletion(Long userId, Long sessionId) {
        // Check if user has a PENDING referral
        Optional<Referral> referralOpt = referralRepo.findByReferredUserId(userId);
        if (referralOpt.isEmpty()) {
            log.debug("No referral found for userId={}, skipping referral bonus", userId);
            return;
        }

        Referral referral = referralOpt.get();

        // Only process if status is PENDING (not already completed)
        if (!ReferralStatus.PENDING.matches(referral.getStatus())) {
            log.debug("Referral already completed for userId={}, skipping", userId);
            return;
        }

        // Award referrer bonus (250 coins)
        if (!referral.isReferrerBonusAwarded()) {
            coinService.awardReferralBonus(referral.getReferrerId(), sessionId);
            referral.setReferrerBonusAwarded(true);

            userNotificationService.createNotification(
                    referral.getReferrerId(),
                    "Referral Bonus Earned!",
                    "Your friend completed their first charging session! You earned "
                            + CoinService.REFERRAL_BONUS + " coins.",
                    "REWARD");
        }

        // Award referred user bonus (50 coins)
        if (!referral.isReferredBonusAwarded()) {
            coinService.awardReferredBonus(userId, sessionId);
            referral.setReferredBonusAwarded(true);

            userNotificationService.createNotification(
                    userId,
                    "Welcome Bonus Earned!",
                    "You earned " + CoinService.REFERRED_BONUS
                            + " coins as a referral welcome bonus!",
                    "REWARD");
        }

        // Mark referral as completed
        referral.setStatus(ReferralStatus.COMPLETED.getValue());
        referral.setCompletedAt(LocalDateTime.now());
        referralRepo.save(referral);

        log.info("Referral completed: referrerId={}, referredUserId={}, sessionId={}",
                referral.getReferrerId(), userId, sessionId);
    }

    /**
     * Get referral info/stats for a user.
     */
    public ReferralInfoResponse getReferralInfo(Long userId) {
        String referralCode = getOrGenerateReferralCode(userId);

        List<Referral> allReferrals = referralRepo.findByReferrerId(userId);
        long total = allReferrals.size();
        long completed = allReferrals.stream()
                .filter(r -> ReferralStatus.COMPLETED.matches(r.getStatus()))
                .count();
        long pending = total - completed;
        int totalCoinsEarned = (int) (completed * CoinService.REFERRAL_BONUS);

        return new ReferralInfoResponse(referralCode, total, completed, pending, totalCoinsEarned);
    }

    /**
     * Generate a random alphanumeric code of specified length.
     */
    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(REFERRAL_CODE_LENGTH);
        for (int i = 0; i < REFERRAL_CODE_LENGTH; i++) {
            sb.append(REFERRAL_CHARS.charAt(random.nextInt(REFERRAL_CHARS.length())));
        }
        return sb.toString();
    }
}
