package com.bentork.ev_system.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.RFIDApplicationRequest;
import com.bentork.ev_system.dto.request.RFIDCardApprovalRequest;
import com.bentork.ev_system.dto.request.RFIDCardRequest;
import com.bentork.ev_system.model.RFIDCard;
import com.bentork.ev_system.model.RFIDCardApplication;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.enums.RFIDApplicationStatus;
import com.bentork.ev_system.repository.RFIDCardApplicationRepository;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RFIDCardApplicationService {

    private final RFIDCardApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final RFIDCardService rfidCardService;
    private final IAdminNotificationService adminNotificationService;

    @Transactional
    public RFIDCardApplication submitApplication(Long userId, RFIDApplicationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        RFIDCardApplication application = new RFIDCardApplication();
        application.setUser(user);
        application.setFullName(request.getFullName());
        application.setMobile(request.getMobile());
        application.setEmail(request.getEmail());
        application.setAddress(request.getAddress());
        application.setStatus(RFIDApplicationStatus.PENDING);

        RFIDCardApplication saved = applicationRepository.save(application);
        log.info("Saved new RFID Application ID: {} for User: {}", saved.getId(), userId);
        return saved;
    }

    public List<RFIDCardApplication> getAllApplications() {
        return applicationRepository.findAll();
    }

    public List<RFIDCardApplication> getApplicationsByUser(Long userId) {
        return applicationRepository.findByUserId(userId);
    }

    public RFIDCardApplication getApplicationById(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("RFID Application not found with ID: " + id));
    }

    @Transactional
    public RFIDCardApplication updateApplicationStatus(Long id, RFIDApplicationStatus status) {
        RFIDCardApplication application = getApplicationById(id);
        application.setStatus(status);
        return applicationRepository.save(application);
    }

    @Transactional
    public RFIDCardApplication approveAndRegisterCard(Long applicationId, RFIDCardApprovalRequest req) {
        RFIDCardApplication application = getApplicationById(applicationId);

        if (application.getStatus() == RFIDApplicationStatus.APPROVED) {
            throw new RuntimeException("Application is already approved.");
        }

        // Create the RFID Card
        RFIDCardRequest cardReq = new RFIDCardRequest();
        cardReq.setUserId(application.getUser().getId());
        cardReq.setCardNumber(req.getCardNumber());
        cardReq.setBoxId(req.getBoxId());

        RFIDCard newCard = rfidCardService.registerCard(cardReq);

        // Update application
        application.setAssignedCard(newCard);
        application.setStatus(RFIDApplicationStatus.APPROVED);

        log.info("Approved Application ID: {}, Assigned Card ID: {}", applicationId, newCard.getId());

        return applicationRepository.save(application);
    }

    @Transactional
    public RFIDCardApplication markAsReceived(Long applicationId, Long userId) {
        RFIDCardApplication application = getApplicationById(applicationId);

        if (!application.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Application does not belong to the user.");
        }

        application.setStatus(RFIDApplicationStatus.DELIVERED);
        RFIDCardApplication saved = applicationRepository.save(application);

        String message = "the rfid card recieved pls active the Rfid card . (App ID: " + applicationId + ")";
        adminNotificationService.createSystemNotification(message, "RFID_RECEIVED");

        log.info("User {} marked RFID application {} as received", userId, applicationId);

        return saved;
    }
}
