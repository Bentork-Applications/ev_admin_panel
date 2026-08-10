package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;

import com.bentork.ev_system.config.JwtUtil;
import com.bentork.ev_system.dto.request.JwtResponse;
import com.bentork.ev_system.dto.request.UserLoginRequest;
import com.bentork.ev_system.dto.request.UserSignupRequest;
import com.bentork.ev_system.model.*;
import com.bentork.ev_system.repository.*;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import com.bentork.ev_system.service.interfaces.IUserAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAuthService implements IUserAuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final OtpDeliveryService otpDeliveryService;
    private final IAdminNotificationService adminNotificationService;
    private final ConsentService consentService;

    // Repositories needed for DPDPA-compliant account deletion
    private final SessionRepository sessionRepo;
    private final RevenueRepository revenueRepo;
    private final ReceiptRepository receiptRepo;
    private final WalletTransactionRepository walletTransactionRepo;
    private final CoinTransactionRepository coinTransactionRepo;
    private final StationReviewRepository stationReviewRepo;
    private final SlotBookingRepository slotBookingRepo;
    private final UserNotificationRepository userNotificationRepo;
    private final UserConsentRepository userConsentRepo;
    private final RFIDCardRepository rfidCardRepo;
    private final RFIDCardApplicationRepository rfidCardApplicationRepo;
    private final ReferralRepository referralRepo;
    private final UserPlanSelectionRepository userPlanSelectionRepo;
    private final OrderRepository orderRepo;

    @Override
    @CacheEvict(value = "user-data", allEntries = true)
    public String register(UserSignupRequest request, String ipAddress) {
        if (!request.getPassword().equals(request.getConfirmPassword()))
            throw new IllegalArgumentException("Passwords do not match");
        if (userRepo.existsByEmail(request.getEmail()))
            throw new IllegalArgumentException("Email already in use");

        // Validate DPDPA consent (also validated by @AssertTrue, but defense-in-depth)
        consentService.validateRegistrationConsent(
                request.isConsentToTerms(), request.isConsentToDataProcessing());

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setMobile(request.getMobile());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepo.save(user);

        // Record DPDPA consent
        consentService.grantRegistrationConsents(user, ipAddress);

        adminNotificationService.notifyNewUserRegistration(user.getName());
        return "User registered successfully";
    }

    @Override
    public JwtResponse login(UserLoginRequest request) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmailOrMobile(), request.getPassword()));
        String token = jwtUtil.generateToken((UserDetails) auth.getPrincipal());
        return new JwtResponse(token);
    }

    @Override
    public void sendOtp(String email) {
        if (!userRepo.existsByEmail(email)) {
            throw new RuntimeException("Email not registered");
        }
        String otp = otpService.generateOtp(email);
        otpDeliveryService.sendOtp(email, otp);
    }

    @Override
    public void resetPassword(String email, String otp, String newPassword) {
        if (!otpService.validateOtp(email, otp)) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }
        User user = userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        otpService.clearOtp(email);
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public JwtResponse googleLogin(String email) {
        User user = userRepo.findByEmail(email).orElseGet(() -> {
            log.info("New Google user detected, auto-registering: {}", PiiMaskingUtil.maskEmail(email));
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(email.split("@")[0]); // default name from email prefix
            // password left null — valid for Google-only login (see User.java line 28)
            userRepo.save(newUser);
            adminNotificationService.notifyNewUserRegistration(newUser.getName());
            return newUser;
        });

        // Block login for deactivated accounts
        if (!user.getActive()) {
            log.warn("Google login blocked for deactivated account: {}", PiiMaskingUtil.maskEmail(email));
            throw new DisabledException("Your account has been deactivated. Please contact support.");
        }

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password("")
                .authorities("USER")
                .build();
        return new JwtResponse(jwtUtil.generateToken(userDetails));
    }

    /**
     * POST-based Google login with DPDPA consent.
     * For new users: validates and records consent before creating the account.
     * For existing users: consent fields are ignored (login-only flow).
     */
    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public JwtResponse googleLoginWithConsent(String email, boolean consentToTerms,
                                              boolean consentToDataProcessing, String ipAddress) {
        boolean isNewUser = !userRepo.existsByEmail(email);

        if (isNewUser) {
            // Validate consent for new users
            consentService.validateRegistrationConsent(consentToTerms, consentToDataProcessing);
        }

        User user = userRepo.findByEmail(email).orElseGet(() -> {
            log.info("New Google user detected (POST login), auto-registering: {}", PiiMaskingUtil.maskEmail(email));
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(email.split("@")[0]);
            userRepo.save(newUser);
            adminNotificationService.notifyNewUserRegistration(newUser.getName());
            return newUser;
        });

        // Record consent for new users after the user entity is persisted
        if (isNewUser) {
            consentService.grantRegistrationConsents(user, ipAddress);
        }

        // Block login for deactivated accounts
        if (!user.getActive()) {
            log.warn("Google login blocked for deactivated account: {}", PiiMaskingUtil.maskEmail(email));
            throw new DisabledException("Your account has been deactivated. Please contact support.");
        }

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password("")
                .authorities("USER")
                .build();
        return new JwtResponse(jwtUtil.generateToken(userDetails));
    }

    /**
     * DPDPA Section 12 — Right to Erasure.
     * Permanently deletes the user account and erases all personal data.
     *
     * <p><b>Retained (FK nullified):</b> Sessions, WalletTransactions, Revenue,
     * Receipts, CoinTransactions, Orders — financial/operational records required
     * for GST/tax compliance and business reporting.</p>
     *
     * <p><b>Deleted:</b> StationReviews, SlotBookings, UserNotifications,
     * UserConsents, RFIDCardApplications, Referrals, UserPlanSelections,
     * and the User row itself.</p>
     *
     * <p><b>Deactivated & unlinked:</b> RFIDCards (hardware assets, kept but
     * disassociated from the deleted user).</p>
     */
    @Override
    @Transactional
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void deleteAccount(String email) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long userId = user.getId();

        // ── Guard: Block deletion if user has an active charging session ──
        boolean hasActiveSession = sessionRepo.existsByUserIdAndStatus(userId, "ACTIVE")
                || sessionRepo.existsByUserIdAndStatus(userId, "INITIATED");
        if (hasActiveSession) {
            throw new IllegalStateException(
                    "Cannot delete account while a charging session is active or initiated. "
                    + "Please wait until your session completes.");
        }

        log.info("Starting DPDPA-compliant account deletion for user: {} (id: {})", PiiMaskingUtil.maskEmail(email), userId);

        // ── Step 1: Nullify FKs in retained financial/operational records ──

        // Sessions — preserve charging history, remove user link
        List<Session> sessions = sessionRepo.findByUserId(userId);
        for (Session session : sessions) {
            session.setUser(null);
        }
        sessionRepo.saveAll(sessions);
        log.debug("Nullified user FK in {} session(s)", sessions.size());

        // Revenue — preserve financial records, remove user link
        List<Revenue> revenues = revenueRepo.findByUser_Id(userId);
        for (Revenue revenue : revenues) {
            revenue.setUser(null);
        }
        revenueRepo.saveAll(revenues);
        log.debug("Nullified user FK in {} revenue record(s)", revenues.size());

        // Receipts — preserve financial records, remove user link
        List<Receipt> receipts = receiptRepo.findByUserId(userId);
        for (Receipt receipt : receipts) {
            receipt.setUser(null);
        }
        receiptRepo.saveAll(receipts);
        log.debug("Nullified user FK in {} receipt(s)", receipts.size());

        // Wallet transactions — preserve financial/GST records, remove user link
        List<WalletTransaction> walletTxns = walletTransactionRepo.findByUserId(userId);
        for (WalletTransaction txn : walletTxns) {
            txn.setUserId(null);
        }
        walletTransactionRepo.saveAll(walletTxns);
        log.debug("Nullified userId in {} wallet transaction(s)", walletTxns.size());

        // Coin transactions — preserve session-linked records, remove user link
        List<CoinTransaction> coinTxns = coinTransactionRepo.findByUserIdOrderByCreatedAtDesc(userId);
        for (CoinTransaction txn : coinTxns) {
            txn.setUserId(null);
        }
        coinTransactionRepo.saveAll(coinTxns);
        log.debug("Nullified userId in {} coin transaction(s)", coinTxns.size());

        // Orders — preserve business records, nullify assigned user
        orderRepo.nullifyAssignedUser(userId);
        log.debug("Nullified assignedUserId in orders for user {}", userId);

        // ── Step 2: Deactivate & unlink RFID cards (hardware assets) ──
        List<RFIDCard> rfidCards = rfidCardRepo.findByUserId(userId);
        for (RFIDCard card : rfidCards) {
            card.setUser(null);
            card.setActive(false);
        }
        rfidCardRepo.saveAll(rfidCards);
        log.debug("Deactivated & unlinked {} RFID card(s)", rfidCards.size());

        // ── Step 3: Delete user-specific records (PII or no retention need) ──

        stationReviewRepo.deleteByUserId(userId);
        log.debug("Deleted station reviews for user {}", userId);

        slotBookingRepo.deleteByUserId(userId);
        log.debug("Deleted slot bookings for user {}", userId);

        userNotificationRepo.deleteByUser(user);
        log.debug("Deleted notifications for user {}", userId);

        userConsentRepo.deleteByUser(user);
        log.debug("Deleted consent records for user {}", userId);

        rfidCardApplicationRepo.deleteByUserId(userId);
        log.debug("Deleted RFID card applications for user {}", userId);

        referralRepo.deleteByReferrerIdOrReferredUserId(userId, userId);
        log.debug("Deleted referrals involving user {}", userId);

        userPlanSelectionRepo.deleteByUserId(userId);
        log.debug("Deleted plan selections for user {}", userId);

        // ── Step 4: Delete the User row — permanent erasure ──
        userRepo.delete(user);

        log.info("DPDPA account deletion completed for user id: {}. "
                + "Personal data erased, financial records retained with nullified user references.", userId);
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'total-users'")
    public long getTotalUsers() {
        return userRepo.countByActiveTrue();
    }

    @Override
    @Cacheable(value = "user-data", key = "#email")
    public User getUserDetailsByEmail(String email) throws Exception {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new Exception("User with email '" + PiiMaskingUtil.maskEmail(email) + "' not found."));
    }

    @Override
    @Cacheable(value = "user-data", key = "'all-users'")
    public List<User> getAllUsers() {
        return userRepo.findByActiveTrue();
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void deactivateUser(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        userRepo.save(user);
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void reactivateUser(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(true);
        userRepo.save(user);
    }

    @Override
    @Cacheable(value = "user-data", key = "#id")
    public User getUserById(Long id) throws Exception {
        return userRepo.findById(id).orElseThrow(() -> new Exception("User not found"));
    }
}