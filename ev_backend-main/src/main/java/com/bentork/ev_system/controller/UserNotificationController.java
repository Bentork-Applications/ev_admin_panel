package com.bentork.ev_system.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bentork.ev_system.dto.request.FcmTokenDTO;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserNotification;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/notifications")
@Slf4j
public class UserNotificationController {

    private final IUserNotificationService service;
    private final UserRepository userRepository; // 1. Added Repository

    // 2. Updated Constructor
    public UserNotificationController(IUserNotificationService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    // --- NEW ENDPOINT: Register FCM Token ---
    @PostMapping("/user/{userId}/fcm-token")
    public ResponseEntity<?> registerFcmToken(
            @PathVariable Long userId,
            @RequestBody FcmTokenDTO tokenDto) {

        log.info("POST /api/notifications/user/{}/fcm-token - Registering token", userId);

        try {
            if (tokenDto.getFcmToken() == null || tokenDto.getFcmToken().isEmpty()) {
                return ResponseEntity.badRequest().body("Token cannot be empty");
            }

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            user.setFcmToken(tokenDto.getFcmToken());
            userRepository.save(user);

            log.info("POST /api/notifications/user/{}/fcm-token - Success", userId);
            return ResponseEntity.ok("FCM Token registered successfully");
        } catch (Exception e) {
            log.error("POST /api/notifications/user/{}/fcm-token - Failed: {}", userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error registering token");
        }
    }

    // --- EXISTING ENDPOINTS BELOW ---

    // Get all notifications for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserNotification>> getUserNotifications(@PathVariable Long userId) {
        log.debug("GET /api/notifications/user/{} - Request received", userId);

        try {
            List<UserNotification> notifications = service.getUserNotifications(userId);
            log.debug("GET /api/notifications/user/{} - Success, returned {} notifications",
                    userId, notifications.size());
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            log.error("GET /api/notifications/user/{} - Failed: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get only unread notifications
    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<UserNotification>> getUnreadNotifications(@PathVariable Long userId) {
        log.debug("GET /api/notifications/user/{}/unread - Request received", userId);

        try {
            List<UserNotification> notifications = service.getUnreadNotifications(userId);
            log.debug("GET /api/notifications/user/{}/unread - Success, returned {} unread notifications",
                    userId, notifications.size());
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            log.error("GET /api/notifications/user/{}/unread - Failed: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Create a notification for a user
    @PostMapping("/user/{userId}")
    public ResponseEntity<UserNotification> createNotification(
            @PathVariable Long userId,
            @RequestBody Map<String, String> payload) {

        String title = payload.get("title");
        String message = payload.get("message");
        String type = payload.get("type");

        log.info("POST /api/notifications/user/{} - Creating notification, type={}", userId, type);

        try {
            UserNotification notification = service.createNotification(userId, title, message, type);
            log.info("POST /api/notifications/user/{} - Success, notificationId={}",
                    userId, notification.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(notification);
        } catch (Exception e) {
            log.error("POST /api/notifications/user/{} - Failed, type={}: {}",
                    userId, type, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Mark a notification as read
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<UserNotification> markAsRead(@PathVariable Long notificationId) {
        log.info("POST /api/notifications/{}/read - Marking as read", notificationId);

        try {
            Optional<UserNotification> updated = service.markAsRead(notificationId);

            if (updated.isPresent()) {
                log.info("POST /api/notifications/{}/read - Success", notificationId);
                return ResponseEntity.ok(updated.get());
            } else {
                log.warn("POST /api/notifications/{}/read - Notification not found", notificationId);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("POST /api/notifications/{}/read - Failed: {}",
                    notificationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}