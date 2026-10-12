package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.AdminNotificationDTO;
import com.bentork.ev_system.dto.request.FcmTokenDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

    private final IAdminNotificationService notificationService;
    private final AdminRepository adminRepository; // 1. Added Repository

    // 2. Constructor Injection
    public AdminNotificationController(IAdminNotificationService notificationService,
            AdminRepository adminRepository) {
        this.notificationService = notificationService;
        this.adminRepository = adminRepository;
    }

    // --- NEW ENDPOINT: Register Admin FCM Token ---
    @PostMapping("/{adminId}/fcm-token")
    public ResponseEntity<?> registerAdminFcmToken(
            @PathVariable Long adminId,
            @RequestBody FcmTokenDTO tokenDto) {

        if (tokenDto.getFcmToken() == null || tokenDto.getFcmToken().isEmpty()) {
            return ResponseEntity.badRequest().body("Token cannot be empty");
        }

        try {
            Admin admin = adminRepository.findById(adminId)
                    .orElseThrow(() -> new RuntimeException("Admin not found"));

            admin.setFcmToken(tokenDto.getFcmToken());
            adminRepository.save(admin);

            return ResponseEntity.ok("Admin FCM Token registered successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error registering token: " + e.getMessage());
        }
    }

    // --- EXISTING ENDPOINTS ---

    // Get all notifications for a given admin
    @GetMapping("/{adminId}")
    public List<AdminNotificationDTO> getNotifications(@PathVariable Long adminId) {
        return notificationService.getNotificationsByAdminId(adminId);
    }

    // Mark a notification as read
    @PutMapping("/mark-read/{id}")
    public void markNotificationAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }
}