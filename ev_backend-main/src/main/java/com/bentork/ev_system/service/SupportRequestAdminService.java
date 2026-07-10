package com.bentork.ev_system.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.response.SupportRequestResponse;
import com.bentork.ev_system.enums.RequestStatus;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.DealerSupportRequest;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserSupportRequest;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.DealerSupportRequestRepository;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.repository.UserSupportRequestRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Admin service for support requests.
 * Provides a unified view by merging results from both
 * user_support_requests and dealer_support_requests tables.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupportRequestAdminService {

    private final UserSupportRequestRepository userSupportRequestRepository;
    private final DealerSupportRequestRepository dealerSupportRequestRepository;
    private final PushNotificationService pushNotificationService;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;

    /**
     * Get all support requests from both tables, merged and sorted by createdAt desc.
     */
    public List<SupportRequestResponse> getAllRequests() {
        List<SupportRequestResponse> all = new ArrayList<>();

        all.addAll(userSupportRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapUserToResponse)
                .collect(Collectors.toList()));

        all.addAll(dealerSupportRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapDealerToResponse)
                .collect(Collectors.toList()));

        all.sort(Comparator.comparing(SupportRequestResponse::getCreatedAt).reversed());
        return all;
    }

    /**
     * Get all requests filtered by status from both tables.
     */
    public List<SupportRequestResponse> getRequestsByStatus(String status) {
        List<SupportRequestResponse> all = new ArrayList<>();

        all.addAll(userSupportRequestRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapUserToResponse)
                .collect(Collectors.toList()));

        all.addAll(dealerSupportRequestRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::mapDealerToResponse)
                .collect(Collectors.toList()));

        all.sort(Comparator.comparing(SupportRequestResponse::getCreatedAt).reversed());
        return all;
    }

    /**
     * Get requests filtered by customer type — queries only the relevant table.
     */
    public List<SupportRequestResponse> getRequestsByCustomerType(String customerType) {
        if ("END_USER".equalsIgnoreCase(customerType)) {
            return userSupportRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(this::mapUserToResponse)
                    .collect(Collectors.toList());
        } else if ("DEALER".equalsIgnoreCase(customerType)) {
            return dealerSupportRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(this::mapDealerToResponse)
                    .collect(Collectors.toList());
        }
        return new ArrayList<>();
    }

    /**
     * Update a user support request's status.
     */
    public SupportRequestResponse updateUserRequestStatus(Long id, String newStatusString) {
        UserSupportRequest request = userSupportRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User support request not found with ID: " + id));

        validateAndSetStatus(request.getStatus(), newStatusString);
        request.setStatus(RequestStatus.fromString(newStatusString).getValue());
        UserSupportRequest updated = userSupportRequestRepository.save(request);
        log.info("Updated user support request {} status to {}", id, updated.getStatus());

        // Send push notification to the user
        sendUserPushNotification(updated);

        return mapUserToResponse(updated);
    }

    /**
     * Update a dealer support request's status.
     */
    public SupportRequestResponse updateDealerRequestStatus(Long id, String newStatusString) {
        DealerSupportRequest request = dealerSupportRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dealer support request not found with ID: " + id));

        validateAndSetStatus(request.getStatus(), newStatusString);
        request.setStatus(RequestStatus.fromString(newStatusString).getValue());
        DealerSupportRequest updated = dealerSupportRequestRepository.save(request);
        log.info("Updated dealer support request {} status to {}", id, updated.getStatus());

        // Send push notification to the dealer
        sendDealerPushNotification(updated);

        return mapDealerToResponse(updated);
    }

    // ==================== Private Helpers ====================

    private void validateAndSetStatus(String currentStatusString, String newStatusString) {
        RequestStatus currentStatus = RequestStatus.fromString(currentStatusString);
        RequestStatus newStatus = RequestStatus.fromString(newStatusString);

        if (newStatus == null) {
            throw new IllegalArgumentException("Invalid status: " + newStatusString);
        }

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new IllegalArgumentException(
                    "Invalid status transition from " + currentStatus + " to " + newStatus);
        }
    }

    private boolean isValidTransition(RequestStatus current, RequestStatus next) {
        if (current == RequestStatus.PENDING && next == RequestStatus.APPROVED) return true;
        if (current == RequestStatus.APPROVED && next == RequestStatus.IN_PROGRESS) return true;
        if (current == RequestStatus.IN_PROGRESS && next == RequestStatus.COMPLETED) return true;
        return false;
    }

    private void sendUserPushNotification(UserSupportRequest request) {
        Optional<User> userOpt = userRepository.findByEmail(request.getSubmitterEmail());
        if (userOpt.isPresent()) {
            String token = userOpt.get().getFcmToken();
            if (token != null && !token.isEmpty()) {
                String title = "Support Request Update";
                String body = "Your support request regarding " + request.getProduct()
                        + " is now: " + request.getStatus().replace("_", " ").toUpperCase();
                pushNotificationService.sendNotification(token, title, body);
                return;
            }
        }
        log.warn("Could not send push notification for user support request {}: No FCM token found for {}",
                request.getId(), request.getSubmitterEmail());
    }

    private void sendDealerPushNotification(DealerSupportRequest request) {
        Optional<Admin> adminOpt = adminRepository.findByEmail(request.getSubmitterEmail());
        if (adminOpt.isPresent()) {
            String token = adminOpt.get().getFcmToken();
            if (token != null && !token.isEmpty()) {
                String title = "Support Request Update";
                String body = "Your support request regarding " + request.getProduct()
                        + " is now: " + request.getStatus().replace("_", " ").toUpperCase();
                pushNotificationService.sendNotification(token, title, body);
                return;
            }
        }
        log.warn("Could not send push notification for dealer support request {}: No FCM token found for {}",
                request.getId(), request.getSubmitterEmail());
    }

    private SupportRequestResponse mapUserToResponse(UserSupportRequest request) {
        SupportRequestResponse response = new SupportRequestResponse();
        response.setId(request.getId());
        response.setCustomerFullName(request.getCustomerFullName());
        response.setProduct(request.getProduct());
        response.setIssueDescription(request.getIssueDescription());
        response.setStatus(request.getStatus());
        response.setCustomerType("END_USER");
        response.setSubmitterEmail(request.getSubmitterEmail());
        response.setCreatedAt(request.getCreatedAt());
        response.setUpdatedAt(request.getUpdatedAt());
        return response;
    }

    private SupportRequestResponse mapDealerToResponse(DealerSupportRequest request) {
        SupportRequestResponse response = new SupportRequestResponse();
        response.setId(request.getId());
        response.setCustomerFullName(request.getCustomerFullName());
        response.setProduct(request.getProduct());
        response.setIssueDescription(request.getIssueDescription());
        response.setStatus(request.getStatus());
        response.setCustomerType("DEALER");
        response.setSubmitterEmail(request.getSubmitterEmail());
        response.setCreatedAt(request.getCreatedAt());
        response.setUpdatedAt(request.getUpdatedAt());
        return response;
    }
}
