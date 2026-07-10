package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.SupportRequestDTO;
import com.bentork.ev_system.dto.response.SupportRequestResponse;
import com.bentork.ev_system.enums.RequestStatus;
import com.bentork.ev_system.model.UserSupportRequest;
import com.bentork.ev_system.repository.UserSupportRequestRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSupportRequestService {

    private final UserSupportRequestRepository userSupportRequestRepository;

    public SupportRequestResponse createRequest(SupportRequestDTO dto, String submitterEmail) {
        UserSupportRequest request = new UserSupportRequest();
        request.setCustomerFullName(dto.getCustomerFullName());
        request.setProduct(dto.getProduct());
        request.setIssueDescription(dto.getIssueDescription());
        request.setStatus(RequestStatus.PENDING.getValue());
        request.setSubmitterEmail(submitterEmail);

        UserSupportRequest saved = userSupportRequestRepository.save(request);
        log.info("Created user support request with ID {} for {}", saved.getId(), submitterEmail);

        return mapToResponse(saved);
    }

    public List<SupportRequestResponse> getMyRequests(String email) {
        return userSupportRequestRepository.findBySubmitterEmailOrderByCreatedAtDesc(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private SupportRequestResponse mapToResponse(UserSupportRequest request) {
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
}
