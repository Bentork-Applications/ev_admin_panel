package com.bentork.ev_system.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.ClaimRejectDTO;
import com.bentork.ev_system.dto.request.DispatchDetailsDTO;
import com.bentork.ev_system.dto.request.WarrantyClaimDTO;
import com.bentork.ev_system.dto.response.AverageProcessingTimeResponse;
import com.bentork.ev_system.dto.response.WarrantyClaimResponse;
import com.bentork.ev_system.enums.WarrantyClaimStatus;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.WarrantyClaim;
import com.bentork.ev_system.repository.BatteryDataRepository;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.repository.WarrantyClaimRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarrantyClaimService {

    private final WarrantyClaimRepository warrantyClaimRepository;
    private final BatteryDataRepository batteryDataRepository;
    private final PushNotificationService pushNotificationService;
    private final UserRepository userRepository;

    // ==================== USER METHODS ====================

    /**
     * Create a warranty claim. Validates battery exists, warranty is active, and terms are accepted.
     * Auto-fills customer name, invoice number, and product details from BatteryData.
     */
    public WarrantyClaimResponse createClaim(WarrantyClaimDTO dto, String userEmail) {
        // Validate battery exists
        BatteryData battery = batteryDataRepository.findById(dto.getBatteryDataId())
                .orElseThrow(() -> new IllegalArgumentException("Battery not found with ID: " + dto.getBatteryDataId()));

        // Validate warranty is active
        if (LocalDate.now().isAfter(battery.getWarrantyEndDate())) {
            throw new IllegalArgumentException("Warranty has expired for this battery. Warranty ended on: " + battery.getWarrantyEndDate());
        }

        // Validate terms accepted
        if (dto.getTermsAccepted() == null || !dto.getTermsAccepted()) {
            throw new IllegalArgumentException("You must accept the Terms & Conditions to submit a warranty claim");
        }

        // Validate photo is provided
        if (dto.getPhotoBase64() == null || dto.getPhotoBase64().isEmpty()) {
            throw new IllegalArgumentException("Photo is required for warranty claim");
        }

        // Create claim with auto-filled fields
        WarrantyClaim claim = new WarrantyClaim();
        claim.setBatteryDataId(battery.getId());
        claim.setCustomerName(battery.getCustomerName());
        claim.setInvoiceNumber(battery.getInvoiceNumber());
        claim.setProductDetails(battery.getProductDetails());
        claim.setIssueDescription(dto.getIssueDescription());
        claim.setPhotoBase64(dto.getPhotoBase64());
        claim.setTermsAccepted(dto.getTermsAccepted());
        claim.setStatus(WarrantyClaimStatus.REQUEST_CREATED.getValue());
        claim.setSubmitterEmail(userEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Warranty claim {} created by user {} for battery {}", saved.getId(), userEmail, battery.getId());

        return mapToResponse(saved);
    }

    /**
     * Get all claims submitted by a specific user.
     */
    public List<WarrantyClaimResponse> getUserClaims(String userEmail) {
        return warrantyClaimRepository.findBySubmitterEmailOrderByCreatedAtDesc(userEmail).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific claim detail for a user (validates ownership).
     */
    public WarrantyClaimResponse getUserClaimDetail(Long claimId, String userEmail) {
        WarrantyClaim claim = warrantyClaimRepository.findByIdAndSubmitterEmail(claimId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Warranty claim not found or you don't have access"));
        return mapToResponse(claim);
    }

    /**
     * User confirms they received the repaired product.
     * Transitions from DELIVERED → USER_CONFIRMED → CLOSED.
     */
    public WarrantyClaimResponse userConfirmReceived(Long claimId, String userEmail) {
        WarrantyClaim claim = warrantyClaimRepository.findByIdAndSubmitterEmail(claimId, userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Warranty claim not found or you don't have access"));

        validateAndTransition(claim, WarrantyClaimStatus.USER_CONFIRMED);
        claim.setUserConfirmedAt(LocalDateTime.now());

        // Auto-transition to CLOSED
        claim.setStatus(WarrantyClaimStatus.CLOSED.getValue());
        claim.setClosedAt(LocalDateTime.now());

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("User {} confirmed receipt for claim {}. Claim is now CLOSED.", userEmail, claimId);

        return mapToResponse(saved);
    }

    // ==================== ADMIN/STAFF METHODS ====================

    /**
     * Get all warranty claims. Used by Admin/Staff dashboard.
     */
    public List<WarrantyClaimResponse> getAllClaims() {
        return warrantyClaimRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get claims filtered by status.
     */
    public List<WarrantyClaimResponse> getClaimsByStatus(String status) {
        return warrantyClaimRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific claim detail (admin view).
     */
    public WarrantyClaimResponse getClaimDetail(Long claimId) {
        WarrantyClaim claim = warrantyClaimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Warranty claim not found with ID: " + claimId));
        return mapToResponse(claim);
    }

    /**
     * Approve a warranty claim. Sends FCM notification to user.
     */
    public WarrantyClaimResponse approveClaim(Long claimId, String adminEmail) {
        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.APPROVED);

        claim.setApprovedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Claim {} approved by admin {}", claimId, adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Warranty Claim Approved",
                "Your warranty claim for " + claim.getProductDetails() + " has been approved. Please send the battery to our service center.");

        return mapToResponse(saved);
    }

    /**
     * Reject a warranty claim with a reason. Sends FCM notification to user.
     */
    public WarrantyClaimResponse rejectClaim(Long claimId, ClaimRejectDTO rejectDTO, String adminEmail) {
        if (rejectDTO.getRejectReason() == null || rejectDTO.getRejectReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Reject reason is required");
        }

        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.REJECTED);

        claim.setRejectReason(rejectDTO.getRejectReason());
        claim.setRejectedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Claim {} rejected by admin {} with reason: {}", claimId, adminEmail, rejectDTO.getRejectReason());

        sendUserNotification(claim.getSubmitterEmail(),
                "Warranty Claim Rejected",
                "Your warranty claim for " + claim.getProductDetails() + " has been rejected. Reason: " + rejectDTO.getRejectReason());

        return mapToResponse(saved);
    }

    /**
     * Mark product as received at service center.
     */
    public WarrantyClaimResponse receiveProduct(Long claimId, String adminEmail) {
        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.PRODUCT_RECEIVED);

        claim.setProductReceivedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Product received for claim {} by admin {}", claimId, adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Battery Received",
                "We have received your battery for " + claim.getProductDetails() + ". Processing will begin shortly.");

        return mapToResponse(saved);
    }

    /**
     * Mark processing started on the battery.
     */
    public WarrantyClaimResponse startProcessing(Long claimId, String adminEmail) {
        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.PROCESSING);

        claim.setProcessingStartedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Processing started for claim {} by admin {}", claimId, adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Battery Processing",
                "Work has started on your battery (" + claim.getProductDetails() + ").");

        return mapToResponse(saved);
    }

    /**
     * Mark processing as completed.
     */
    public WarrantyClaimResponse completeProcessing(Long claimId, String adminEmail) {
        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.COMPLETED);

        claim.setCompletedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Processing completed for claim {} by admin {}", claimId, adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Battery Repair Complete",
                "Your battery repair for " + claim.getProductDetails() + " is complete. It will be dispatched soon.");

        return mapToResponse(saved);
    }

    /**
     * Dispatch the repaired product with courier details.
     */
    public WarrantyClaimResponse dispatchProduct(Long claimId, DispatchDetailsDTO dispatchDTO, String adminEmail) {
        if (dispatchDTO.getCourierName() == null || dispatchDTO.getCourierName().trim().isEmpty()) {
            throw new IllegalArgumentException("Courier name is required");
        }
        if (dispatchDTO.getTrackingNumber() == null || dispatchDTO.getTrackingNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Tracking number is required");
        }

        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.DISPATCHED);

        claim.setCourierName(dispatchDTO.getCourierName());
        claim.setTrackingNumber(dispatchDTO.getTrackingNumber());
        claim.setDispatchDate(dispatchDTO.getDispatchDate() != null ? dispatchDTO.getDispatchDate() : LocalDate.now());
        claim.setDispatchedAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Product dispatched for claim {} via {} (tracking: {}) by admin {}",
                claimId, dispatchDTO.getCourierName(), dispatchDTO.getTrackingNumber(), adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Battery Dispatched",
                "Your battery has been dispatched via " + dispatchDTO.getCourierName()
                        + ". Tracking Number: " + dispatchDTO.getTrackingNumber());

        return mapToResponse(saved);
    }

    /**
     * Mark the product as delivered.
     */
    public WarrantyClaimResponse markDelivered(Long claimId, String adminEmail) {
        WarrantyClaim claim = findClaimById(claimId);
        validateAndTransition(claim, WarrantyClaimStatus.DELIVERED);

        claim.setDeliveredAt(LocalDateTime.now());
        claim.setProcessedByAdminEmail(adminEmail);

        WarrantyClaim saved = warrantyClaimRepository.save(claim);
        log.info("Product marked as delivered for claim {} by admin {}", claimId, adminEmail);

        sendUserNotification(claim.getSubmitterEmail(),
                "Battery Delivered",
                "Your battery for " + claim.getProductDetails() + " has been delivered. Please confirm receipt in the app.");

        return mapToResponse(saved);
    }

    // ==================== PRIVATE HELPERS ====================

    private WarrantyClaim findClaimById(Long claimId) {
        return warrantyClaimRepository.findById(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Warranty claim not found with ID: " + claimId));
    }

    /**
     * Validates current status allows the transition, then updates the status.
     */
    private void validateAndTransition(WarrantyClaim claim, WarrantyClaimStatus targetStatus) {
        WarrantyClaimStatus currentStatus = WarrantyClaimStatus.fromString(claim.getStatus());

        if (currentStatus == null) {
            throw new IllegalArgumentException("Unknown current status: " + claim.getStatus());
        }

        if (!WarrantyClaimStatus.isValidTransition(currentStatus, targetStatus)) {
            throw new IllegalArgumentException(
                    "Invalid status transition from " + currentStatus.getValue() + " to " + targetStatus.getValue());
        }

        claim.setStatus(targetStatus.getValue());
    }

    /**
     * Send FCM push notification to the user who submitted the claim.
     */
    private void sendUserNotification(String userEmail, String title, String body) {
        Optional<User> userOpt = userRepository.findByEmail(userEmail);
        if (userOpt.isPresent()) {
            String token = userOpt.get().getFcmToken();
            if (token != null && !token.isEmpty()) {
                pushNotificationService.sendNotification(token, title, body);
            } else {
                log.warn("No FCM token found for user {}", userEmail);
            }
        } else {
            log.warn("User not found for email {} when sending warranty notification", userEmail);
        }
    }

    /**
     * Compute average processing time across completed claims.
     * Supports optional date-range filtering on completedAt.
     */
    public AverageProcessingTimeResponse getAverageProcessingTime(LocalDateTime from, LocalDateTime to) {
        List<WarrantyClaim> completedClaims;

        if (from != null && to != null) {
            completedClaims = warrantyClaimRepository.findByCompletedAtBetween(from, to);
        } else {
            completedClaims = warrantyClaimRepository.findByCompletedAtIsNotNull();
        }

        AverageProcessingTimeResponse response = new AverageProcessingTimeResponse();
        response.setFromDate(from);
        response.setToDate(to);

        if (completedClaims.isEmpty()) {
            response.setAverageProcessingTimeHours(0.0);
            response.setTotalCompletedClaims(0L);
            return response;
        }

        double totalHours = completedClaims.stream()
                .filter(claim -> claim.getCreatedAt() != null && claim.getCompletedAt() != null)
                .mapToDouble(claim -> {
                    long minutes = Duration.between(claim.getCreatedAt(), claim.getCompletedAt()).toMinutes();
                    return minutes / 60.0;
                })
                .sum();

        long count = completedClaims.stream()
                .filter(claim -> claim.getCreatedAt() != null && claim.getCompletedAt() != null)
                .count();

        double average = count > 0 ? Math.round((totalHours / count) * 100.0) / 100.0 : 0.0;

        response.setAverageProcessingTimeHours(average);
        response.setTotalCompletedClaims(count);
        return response;
    }

    private WarrantyClaimResponse mapToResponse(WarrantyClaim claim) {
        WarrantyClaimResponse response = new WarrantyClaimResponse();
        response.setId(claim.getId());
        response.setBatteryDataId(claim.getBatteryDataId());
        response.setCustomerName(claim.getCustomerName());
        response.setInvoiceNumber(claim.getInvoiceNumber());
        response.setProductDetails(claim.getProductDetails());
        response.setIssueDescription(claim.getIssueDescription());
        response.setPhotoBase64(claim.getPhotoBase64());
        response.setTermsAccepted(claim.getTermsAccepted());
        response.setStatus(claim.getStatus());
        response.setRejectReason(claim.getRejectReason());
        response.setCourierName(claim.getCourierName());
        response.setTrackingNumber(claim.getTrackingNumber());
        response.setDispatchDate(claim.getDispatchDate());
        response.setSubmitterEmail(claim.getSubmitterEmail());
        response.setProcessedByAdminEmail(claim.getProcessedByAdminEmail());
        response.setCreatedAt(claim.getCreatedAt());
        response.setUpdatedAt(claim.getUpdatedAt());
        response.setApprovedAt(claim.getApprovedAt());
        response.setRejectedAt(claim.getRejectedAt());
        response.setProductReceivedAt(claim.getProductReceivedAt());
        response.setProcessingStartedAt(claim.getProcessingStartedAt());
        response.setCompletedAt(claim.getCompletedAt());
        response.setDispatchedAt(claim.getDispatchedAt());
        response.setDeliveredAt(claim.getDeliveredAt());
        response.setUserConfirmedAt(claim.getUserConfirmedAt());
        response.setClosedAt(claim.getClosedAt());

        // Compute per-claim processing duration (createdAt -> completedAt)
        if (claim.getCreatedAt() != null && claim.getCompletedAt() != null) {
            long minutes = Duration.between(claim.getCreatedAt(), claim.getCompletedAt()).toMinutes();
            response.setProcessingDurationHours(Math.round(minutes / 60.0 * 100.0) / 100.0);
        }

        return response;
    }
}
