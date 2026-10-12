package com.bentork.ev_system.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.config.DataSharingRegistry;
import com.bentork.ev_system.dto.response.UserDataExportResponse;
import com.bentork.ev_system.dto.response.UserDataExportResponse.*;
import com.bentork.ev_system.model.*;
import com.bentork.ev_system.repository.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for DPDPA Section 11 — Right to Data Access / Portability.
 * Aggregates personal data from 16 database tables into a unified export.
 * Includes rate limiting (3 requests per user per hour).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserDataExportService {

    private static final int MAX_REQUESTS_PER_HOUR = 3;
    private static final long ONE_HOUR_SECONDS = 3600;

    private static final String DPDPA_NOTICE =
            "This export contains all personal data held by Bentork EV Systems about you, " +
            "in compliance with the Digital Personal Data Protection Act (DPDPA), 2023 — Section 11. " +
            "You have the right to access, correct, and request erasure of your personal data. " +
            "For any questions, contact support@bentork.in.";

    // Repositories
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final UserConsentRepository userConsentRepository;
    private final ReferralRepository referralRepository;
    private final SlotBookingRepository slotBookingRepository;
    private final StationReviewRepository stationReviewRepository;
    private final RFIDCardRepository rfidCardRepository;
    private final RFIDCardApplicationRepository rfidCardApplicationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final UserPlanSelectionRepository userPlanSelectionRepository;
    private final OrderRepository orderRepository;
    private final UserSupportRequestRepository userSupportRequestRepository;
    private final WarrantyClaimRepository warrantyClaimRepository;
    private final ReceiptRepository receiptRepository;

    // Dynamic data sharing disclosure
    private final DataSharingRegistry dataSharingRegistry;

    // In-memory rate limiter: userId -> list of request timestamps
    private final ConcurrentHashMap<Long, List<Instant>> rateLimitMap = new ConcurrentHashMap<>();

    /**
     * Export all personal data for the given user.
     *
     * @param user the authenticated user
     * @return unified data export response
     * @throws RateLimitExceededException if the user exceeds 3 requests per hour
     */
    public UserDataExportResponse exportUserData(User user) {
        checkRateLimit(user.getId());

        log.info("DPDPA data export requested by user: {} (ID: {})", user.getEmail(), user.getId());

        UserDataExportResponse response = UserDataExportResponse.builder()
                .exportedAt(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .requestedBy(user.getEmail())
                .dpdpaNotice(DPDPA_NOTICE)
                .profile(mapProfile(user))
                .chargingSessions(mapSessions(user.getId()))
                .walletTransactions(mapWalletTransactions(user.getId()))
                .coinTransactions(mapCoinTransactions(user.getId()))
                .consents(mapConsents(user))
                .referrals(mapReferrals(user.getId()))
                .slotBookings(mapSlotBookings(user.getId()))
                .stationReviews(mapStationReviews(user.getId()))
                .rfidCards(mapRFIDCards(user.getId()))
                .rfidApplications(mapRFIDApplications(user.getId()))
                .notifications(mapNotifications(user))
                .planSelections(mapPlanSelections(user.getId()))
                .orders(mapOrders(user.getId()))
                .supportRequests(mapSupportRequests(user.getEmail()))
                .warrantyClaims(mapWarrantyClaims(user.getEmail()))
                .receipts(mapReceipts(user.getId()))
                .dataSharedWith(dataSharingRegistry.toDataSharingInfoList())
                .build();

        log.info("DPDPA data export completed for user: {} (ID: {})", user.getEmail(), user.getId());
        return response;
    }

    // ==================== RATE LIMITING ====================

    private void checkRateLimit(Long userId) {
        Instant now = Instant.now();
        Instant oneHourAgo = now.minusSeconds(ONE_HOUR_SECONDS);

        rateLimitMap.compute(userId, (key, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayList<>();
            }

            // Remove expired entries
            Iterator<Instant> it = timestamps.iterator();
            while (it.hasNext()) {
                if (it.next().isBefore(oneHourAgo)) {
                    it.remove();
                }
            }

            if (timestamps.size() >= MAX_REQUESTS_PER_HOUR) {
                throw new RateLimitExceededException(
                        "Data export rate limit exceeded. Maximum " + MAX_REQUESTS_PER_HOUR +
                        " exports per hour. Please try again later.");
            }

            timestamps.add(now);
            return timestamps;
        });
    }

    // ==================== MAPPING METHODS ====================

    private UserProfileData mapProfile(User user) {
        return UserProfileData.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .walletBalance(safeString(user.getWalletBalance()))
                .coinBalance(user.getCoinBalance())
                .referralCode(user.getReferralCode())
                .imageUrl(user.getImageUrl())
                .active(user.getActive())
                .isAdult(user.getIsAdult())
                .accountCreatedAt(user.getCreatedAt())
                .build();
    }

    private List<SessionData> mapSessions(Long userId) {
        return sessionRepository.findByUserId(userId).stream()
                .map(s -> SessionData.builder()
                        .sessionId(s.getId())
                        .chargerBoxId(s.getBoxId())
                        .stationName(s.getCharger() != null && s.getCharger().getStation() != null
                                ? s.getCharger().getStation().getName() : null)
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .energyKwh(s.getEnergyKwh())
                        .cost(s.getCost())
                        .status(s.getStatus())
                        .sourceType(s.getSourceType())
                        .chargingDurationSeconds(s.getChargingDurationSeconds())
                        .amountEntered(safeString(s.getAmountEntered()))
                        .effectiveRateApplied(safeString(s.getEffectiveRateApplied()))
                        .allocatedKwh(safeString(s.getAllocatedKwh()))
                        .chargeableAmount(safeString(s.getChargeableAmount()))
                        .refundAmount(safeString(s.getRefundAmount()))
                        .refundStatus(s.getRefundStatus())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<WalletTransactionData> mapWalletTransactions(Long userId) {
        return walletTransactionRepository.findByUserId(userId).stream()
                .map(wt -> WalletTransactionData.builder()
                        .transactionId(wt.getId())
                        .amount(safeString(wt.getAmount()))
                        .type(wt.getType())
                        .method(wt.getMethod())
                        .status(wt.getStatus())
                        .transactionRef(wt.getTransactionRef())
                        .sessionId(wt.getSessionId())
                        .grossAmount(safeString(wt.getGrossAmount()))
                        .gstAmount(safeString(wt.getGstAmount()))
                        .pstAmount(safeString(wt.getPstAmount()))
                        .createdAt(wt.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<CoinTransactionData> mapCoinTransactions(Long userId) {
        return coinTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ct -> CoinTransactionData.builder()
                        .transactionId(ct.getId())
                        .amount(ct.getAmount())
                        .type(ct.getType())
                        .description(ct.getDescription())
                        .sessionId(ct.getSessionId())
                        .createdAt(ct.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ConsentData> mapConsents(User user) {
        return userConsentRepository.findByUser(user).stream()
                .map(c -> ConsentData.builder()
                        .consentType(c.getConsentType().name())
                        .granted(c.getGranted())
                        .consentText(c.getConsentText())
                        .grantedAt(c.getGrantedAt())
                        .withdrawnAt(c.getWithdrawnAt())
                        .version(c.getVersion())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ReferralData> mapReferrals(Long userId) {
        List<ReferralData> result = new ArrayList<>();

        // Referrals where user is the referrer
        referralRepository.findByReferrerId(userId).forEach(r ->
                result.add(ReferralData.builder()
                        .referralId(r.getId())
                        .role("REFERRER")
                        .status(r.getStatus())
                        .bonusAwarded(r.isReferrerBonusAwarded())
                        .createdAt(r.getCreatedAt())
                        .completedAt(r.getCompletedAt())
                        .build()));

        // Referrals where user was referred
        referralRepository.findByReferredUserId(userId).ifPresent(r ->
                result.add(ReferralData.builder()
                        .referralId(r.getId())
                        .role("REFERRED")
                        .status(r.getStatus())
                        .bonusAwarded(r.isReferredBonusAwarded())
                        .createdAt(r.getCreatedAt())
                        .completedAt(r.getCompletedAt())
                        .build()));

        return result;
    }

    private List<SlotBookingData> mapSlotBookings(Long userId) {
        return slotBookingRepository.findByUserId(userId).stream()
                .map(sb -> SlotBookingData.builder()
                        .bookingId(sb.getId())
                        .stationName(sb.getStation() != null ? sb.getStation().getName() : null)
                        .chargerBoxId(sb.getCharger() != null ? sb.getCharger().getOcppId() : null)
                        .slotTime(sb.getSlot() != null ? formatSlotTime(sb.getSlot()) : null)
                        .status(sb.getStatus())
                        .bookingTime(sb.getBookingTime())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ReviewData> mapStationReviews(Long userId) {
        return stationReviewRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(r -> ReviewData.builder()
                        .reviewId(r.getId())
                        .stationName(r.getStation() != null ? r.getStation().getName() : null)
                        .rating(r.getRating())
                        .reviewText(r.getReviewText())
                        .createdAt(r.getCreatedAt())
                        .updatedAt(r.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<RFIDCardData> mapRFIDCards(Long userId) {
        return rfidCardRepository.findByUserId(userId).stream()
                .map(c -> RFIDCardData.builder()
                        .cardId(c.getId())
                        .cardNumber(c.getCardNumber())
                        .active(c.isActive())
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<RFIDApplicationData> mapRFIDApplications(Long userId) {
        return rfidCardApplicationRepository.findByUserId(userId).stream()
                .map(a -> RFIDApplicationData.builder()
                        .applicationId(a.getId())
                        .fullName(a.getFullName())
                        .mobile(a.getMobile())
                        .email(a.getEmail())
                        .address(a.getAddress())
                        .status(a.getStatus().name())
                        .assignedCardNumber(a.getAssignedCard() != null
                                ? a.getAssignedCard().getCardNumber() : null)
                        .createdAt(a.getCreatedAt())
                        .updatedAt(a.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<NotificationData> mapNotifications(User user) {
        return userNotificationRepository.findByUser(user).stream()
                .map(n -> NotificationData.builder()
                        .notificationId(n.getId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .type(n.getType())
                        .isRead(n.getIsRead())
                        .createdAt(n.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<PlanSelectionData> mapPlanSelections(Long userId) {
        return userPlanSelectionRepository.findByUserId(userId).stream()
                .map(ps -> PlanSelectionData.builder()
                        .selectionId(ps.getId())
                        .planId(ps.getPlanId())
                        .selectedAt(ps.getSelectedAt())
                        .expiresAt(ps.getExpiresAt())
                        .isActive(ps.getIsActive())
                        .build())
                .collect(Collectors.toList());
    }

    private List<OrderData> mapOrders(Long userId) {
        return orderRepository.findByAssignedUserIdOrderByCreatedAtDesc(userId).stream()
                .map(o -> OrderData.builder()
                        .orderNumber(o.getOrderNumber())
                        .customerName(o.getCustomerName())
                        .productDetails(o.getProductDetails())
                        .quantity(o.getTotalQuantity())
                        .mobileNumber(o.getMobileNumber())
                        .expectedDeliveryDate(o.getExpectedDeliveryDate())
                        .paymentStatus(o.getPaymentStatus())
                        .totalInvoiceAmount(o.getTotalInvoiceAmount())
                        .receivedAmount(o.getReceivedAmount())
                        .pendingAmount(o.getPendingAmount())
                        .orderStatus(o.getOrderStatus())
                        .productionStatus(o.getProductionStatus())
                        .invoiceNumber(o.getInvoiceNumber())
                        .barcode(o.getBarcode())
                        .trackingId(o.getTrackingId())
                        .createdAt(o.getCreatedAt())
                        .updatedAt(o.getUpdatedAt())
                        .deliveredAt(o.getDeliveredAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<SupportRequestData> mapSupportRequests(String email) {
        return userSupportRequestRepository.findBySubmitterEmailOrderByCreatedAtDesc(email).stream()
                .map(sr -> SupportRequestData.builder()
                        .requestId(sr.getId())
                        .customerFullName(sr.getCustomerFullName())
                        .product(sr.getProduct())
                        .issueDescription(sr.getIssueDescription())
                        .status(sr.getStatus())
                        .createdAt(sr.getCreatedAt())
                        .updatedAt(sr.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<WarrantyClaimData> mapWarrantyClaims(String email) {
        return warrantyClaimRepository.findBySubmitterEmailOrderByCreatedAtDesc(email).stream()
                .map(wc -> WarrantyClaimData.builder()
                        .claimId(wc.getId())
                        .customerName(wc.getCustomerName())
                        .invoiceNumber(wc.getInvoiceNumber())
                        .productDetails(wc.getProductDetails())
                        .issueDescription(wc.getIssueDescription())
                        .status(wc.getStatus())
                        .rejectReason(wc.getRejectReason())
                        .courierName(wc.getCourierName())
                        .trackingNumber(wc.getTrackingNumber())
                        .dispatchDate(wc.getDispatchDate())
                        .createdAt(wc.getCreatedAt())
                        .updatedAt(wc.getUpdatedAt())
                        .approvedAt(wc.getApprovedAt())
                        .completedAt(wc.getCompletedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private List<ReceiptData> mapReceipts(Long userId) {
        return receiptRepository.findByUserId(userId).stream()
                .map(r -> ReceiptData.builder()
                        .receiptId(r.getId())
                        .sessionType(r.getSessionType())
                        .amount(safeString(r.getAmount()))
                        .selectedKwh(safeString(r.getSelectedKwh()))
                        .status(r.getStatus())
                        .createdAt(r.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== UTILITY ====================

    private String safeString(BigDecimal value) {
        return value != null ? value.toPlainString() : null;
    }

    private String formatSlotTime(Slot slot) {
        if (slot.getStartTime() != null && slot.getEndTime() != null) {
            return slot.getStartTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                    + " — " + slot.getEndTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
        if (slot.getStartTimeOnly() != null && slot.getEndTimeOnly() != null) {
            return "Daily: " + slot.getStartTimeOnly() + " — " + slot.getEndTimeOnly();
        }
        return "N/A";
    }

    // ==================== EXCEPTIONS ====================

    /**
     * Thrown when a user exceeds the data export rate limit.
     */
    public static class RateLimitExceededException extends RuntimeException {
        public RateLimitExceededException(String message) {
            super(message);
        }
    }
}
