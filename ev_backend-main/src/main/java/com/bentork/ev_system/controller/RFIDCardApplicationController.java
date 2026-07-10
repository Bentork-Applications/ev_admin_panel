package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.RFIDApplicationRequest;
import com.bentork.ev_system.dto.request.RFIDCardApprovalRequest;
import com.bentork.ev_system.model.RFIDCardApplication;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.enums.RFIDApplicationStatus;
import com.bentork.ev_system.service.RFIDCardApplicationService;
import com.bentork.ev_system.service.UserAuthService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rfid-applications")
public class RFIDCardApplicationController {

    private final RFIDCardApplicationService applicationService;
    private final UserAuthService userAuthService;

    // User submits an application
    @PostMapping
    public ResponseEntity<RFIDCardApplication> submitApplication(
            @RequestBody RFIDApplicationRequest request,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            Long userId = user.getId();
            log.info("User {} is submitting an RFID application", userId);
            RFIDCardApplication application = applicationService.submitApplication(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(application);
        } catch (Exception e) {
            log.error("Error submitting RFID application: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // User gets their own applications
    @GetMapping("/my-applications")
    public ResponseEntity<List<RFIDCardApplication>> getMyApplications(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            Long userId = user.getId();
            List<RFIDCardApplication> applications = applicationService.getApplicationsByUser(userId);
            return ResponseEntity.ok(applications);
        } catch (Exception e) {
            log.error("Error getting user's applications: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Admin gets all applications
    @GetMapping
    public ResponseEntity<List<RFIDCardApplication>> getAllApplications() {
        log.info("Admin fetching all RFID applications");
        try {
            List<RFIDCardApplication> applications = applicationService.getAllApplications();
            return ResponseEntity.ok(applications);
        } catch (Exception e) {
            log.error("Error fetching all applications: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Admin approves an application
    @PutMapping("/{id}/approve")
    public ResponseEntity<RFIDCardApplication> approveApplication(
            @PathVariable Long id,
            @RequestBody RFIDCardApprovalRequest request) {
        log.info("Admin approving application ID: {}", id);
        try {
            RFIDCardApplication application = applicationService.approveAndRegisterCard(id, request);
            return ResponseEntity.ok(application);
        } catch (RuntimeException e) {
            log.error("Error approving application {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error approving application {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Admin updates application status (e.g., to DISPATCHED)
    @PutMapping("/{id}/status")
    public ResponseEntity<RFIDCardApplication> updateApplicationStatus(
            @PathVariable Long id,
            @RequestParam RFIDApplicationStatus status) {
        log.info("Admin updating application ID: {} status to {}", id, status);
        try {
            RFIDCardApplication application = applicationService.updateApplicationStatus(id, status);
            return ResponseEntity.ok(application);
        } catch (RuntimeException e) {
            log.error("Error updating application status {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error updating application status {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // User marks their RFID card application as received
    @PutMapping("/{id}/receive")
    public ResponseEntity<RFIDCardApplication> markAsReceived(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        log.info("User {} is marking application ID: {} as received", userDetails.getUsername(), id);
        try {
            User user = userAuthService.getUserDetailsByEmail(userDetails.getUsername());
            RFIDCardApplication application = applicationService.markAsReceived(id, user.getId());
            return ResponseEntity.ok(application);
        } catch (RuntimeException e) {
            log.error("Error marking application {} as received: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error marking application {} as received: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
