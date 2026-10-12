package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified response DTO for DPDPA Section 11 — Right to Data Access / Portability.
 * Aggregates all personal data across 16 database tables into a single downloadable JSON.
 * Sensitive internal fields (passwords, FCM tokens, admin emails) are deliberately excluded.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDataExportResponse {

    // ==================== METADATA ====================

    /** ISO-8601 timestamp of when this export was generated. */
    private String exportedAt;

    /** Email of the user who requested this export. */
    private String requestedBy;

    /** DPDPA legal notice informing the user of their rights. */
    private String dpdpaNotice;

    // ==================== USER PROFILE ====================

    private UserProfileData profile;

    // ==================== DATA SECTIONS ====================

    private List<SessionData> chargingSessions;
    private List<WalletTransactionData> walletTransactions;
    private List<CoinTransactionData> coinTransactions;
    private List<ConsentData> consents;
    private List<ReferralData> referrals;
    private List<SlotBookingData> slotBookings;
    private List<ReviewData> stationReviews;
    private List<RFIDCardData> rfidCards;
    private List<RFIDApplicationData> rfidApplications;
    private List<NotificationData> notifications;
    private List<PlanSelectionData> planSelections;
    private List<OrderData> orders;
    private List<SupportRequestData> supportRequests;
    private List<WarrantyClaimData> warrantyClaims;
    private List<ReceiptData> receipts;

    // ==================== DATA SHARING DISCLOSURE ====================

    /** DPDPA requirement: disclose which entities user data has been shared with. */
    private List<DataSharingInfo> dataSharedWith;

    // ==================== INNER DATA CLASSES ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileData {
        private Long id;
        private String name;
        private String email;
        private String mobile;
        private String walletBalance;
        private Integer coinBalance;
        private String referralCode;
        private String imageUrl;
        private Boolean active;
        private Boolean isAdult;
        private LocalDateTime accountCreatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionData {
        private Long sessionId;
        private String chargerBoxId;
        private String stationName;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private double energyKwh;
        private double cost;
        private String status;
        private String sourceType;
        private Long chargingDurationSeconds;
        private String amountEntered;
        private String effectiveRateApplied;
        private String allocatedKwh;
        private String chargeableAmount;
        private String refundAmount;
        private String refundStatus;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletTransactionData {
        private Long transactionId;
        private String amount;
        private String type;
        private String method;
        private String status;
        private String transactionRef;
        private Long sessionId;
        private String grossAmount;
        private String gstAmount;
        private String pstAmount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoinTransactionData {
        private Long transactionId;
        private int amount;
        private String type;
        private String description;
        private Long sessionId;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsentData {
        private String consentType;
        private Boolean granted;
        private String consentText;
        private LocalDateTime grantedAt;
        private LocalDateTime withdrawnAt;
        private String version;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReferralData {
        private Long referralId;
        private String role;  // "REFERRER" or "REFERRED"
        private String status;
        private Boolean bonusAwarded;
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotBookingData {
        private Long bookingId;
        private String stationName;
        private String chargerBoxId;
        private String slotTime;
        private String status;
        private LocalDateTime bookingTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewData {
        private Long reviewId;
        private String stationName;
        private Integer rating;
        private String reviewText;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RFIDCardData {
        private Long cardId;
        private String cardNumber;
        private boolean active;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RFIDApplicationData {
        private Long applicationId;
        private String fullName;
        private String mobile;
        private String email;
        private String address;
        private String status;
        private String assignedCardNumber;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationData {
        private Long notificationId;
        private String title;
        private String message;
        private String type;
        private Boolean isRead;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanSelectionData {
        private Long selectionId;
        private Long planId;
        private LocalDateTime selectedAt;
        private LocalDateTime expiresAt;
        private Boolean isActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderData {
        private String orderNumber;
        private String customerName;
        private String productDetails;
        private Integer quantity;
        private String mobileNumber;
        private LocalDate expectedDeliveryDate;
        private String paymentStatus;
        private Double totalInvoiceAmount;
        private Double receivedAmount;
        private Double pendingAmount;
        private String orderStatus;
        private String productionStatus;
        private String invoiceNumber;
        private String barcode;
        private String trackingId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime deliveredAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupportRequestData {
        private Long requestId;
        private String customerFullName;
        private String product;
        private String issueDescription;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WarrantyClaimData {
        private Long claimId;
        private String customerName;
        private String invoiceNumber;
        private String productDetails;
        private String issueDescription;
        private String status;
        private String rejectReason;
        private String courierName;
        private String trackingNumber;
        private LocalDate dispatchDate;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime approvedAt;
        private LocalDateTime completedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceiptData {
        private Long receiptId;
        private String sessionType;
        private String amount;
        private String selectedKwh;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataSharingInfo {
        /** Name of the external entity or service. */
        private String entityName;
        /** Purpose for sharing data with this entity. */
        private String purpose;
        /** Categories of data shared (e.g., "email", "payment info"). */
        private List<String> dataCategories;
    }
}
