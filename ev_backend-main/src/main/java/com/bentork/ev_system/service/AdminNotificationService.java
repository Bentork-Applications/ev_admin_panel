package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.AdminNotificationDTO;
import com.bentork.ev_system.mapper.AdminNotificationMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.AdminNotification;
import com.bentork.ev_system.repository.AdminNotificationRepository;
import com.bentork.ev_system.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.bentork.ev_system.service.interfaces.IAdminNotificationService;

@Service
public class AdminNotificationService implements IAdminNotificationService {

    private static final Logger log = LoggerFactory.getLogger(AdminNotificationService.class);

    private final AdminNotificationRepository notificationRepository;
    private final AdminRepository adminRepository;
    private final PushNotificationService pushService;

    // specific constructor injection is best practice
    public AdminNotificationService(AdminNotificationRepository notificationRepository,
            AdminRepository adminRepository,
            PushNotificationService pushService) {
        this.notificationRepository = notificationRepository;
        this.adminRepository = adminRepository;
        this.pushService = pushService;
    }

    // 🔔 CREATE notification for new user registration
    public void notifyNewUserRegistration(String userName) {
        List<Admin> admins = adminRepository.findAll();

        for (Admin admin : admins) {
            AdminNotification notification = new AdminNotification();
            notification.setAdmin(admin);
            notification.setType("NEW_USER");
            notification.setMessage("New user registered: " + userName);
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now()); // Ensure timestamp is set

            notificationRepository.save(notification);

            // Trigger Push Notification
            sendPushSafely(admin, "New Registration", "New user registered: " + userName);
        }
    }

    // 📥 Get notifications by adminId
    public List<AdminNotificationDTO> getNotificationsByAdminId(Long adminId) {
        return notificationRepository.findByAdminId(adminId)
                .stream()
                .map(AdminNotificationMapper::toDTO)
                .collect(Collectors.toList());
    }

    // ✅ Mark notification as read
    public void markAsRead(Long notificationId) {
        AdminNotification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification != null) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    public void createSystemNotification(String message, String type) {
        List<Admin> admins = adminRepository.findAll();

        for (Admin admin : admins) {
            AdminNotification notification = new AdminNotification();
            notification.setAdmin(admin);
            notification.setMessage(message);
            notification.setType(type);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);

            notificationRepository.save(notification);

            // Trigger Push Notification
            String title = "System Alert: " + type;
            sendPushSafely(admin, title, message);
        }
    }

    /**
     * Helper method to send push notifications without blocking or crashing the
     * flow.
     */
    private void sendPushSafely(Admin admin, String title, String body) {
        try {
            String token = admin.getFcmToken();
            if (token != null && !token.trim().isEmpty()) {
                pushService.sendNotification(token, title, body);
                log.debug("Push sent to admin: {}", admin.getId());
            }
        } catch (Exception e) {
            // Log error only; do not throw exception to preserve DB transaction
            log.error("Failed to send push to admin {}: {}", admin.getId(), e.getMessage());
        }
    }
}