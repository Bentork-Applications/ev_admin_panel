package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserNotification;
import com.bentork.ev_system.repository.UserNotificationRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;

@Service
@Slf4j
public class UserNotificationService implements IUserNotificationService {

    private final UserNotificationRepository repository;
    private final UserRepository userRepo;

    public UserNotificationService(UserNotificationRepository repository, UserRepository userRepo) {
        this.repository = repository;
        this.userRepo = userRepo;
    }

    // Get all notifications for a user
    public List<UserNotification> getUserNotifications(Long userId) {
        try {
            User user = userRepo.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<UserNotification> notifications = repository.findByUser(user);

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} notifications for userId={}", notifications.size(), userId);
            }

            return notifications;
        } catch (Exception e) {
            log.error("Failed to retrieve notifications for userId={}: {}", userId, e.getMessage(), e);
            throw e;
        }
    }

    // Get only unread notifications
    public List<UserNotification> getUnreadNotifications(Long userId) {
        try {
            User user = userRepo.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<UserNotification> unreadNotifications = repository.findByUserAndIsReadFalse(user);

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} unread notifications for userId={}",
                        unreadNotifications.size(), userId);
            }

            return unreadNotifications;
        } catch (Exception e) {
            log.error("Failed to retrieve unread notifications for userId={}: {}",
                    userId, e.getMessage(), e);
            throw e;
        }
    }

    // Create and save new notification
    public UserNotification createNotification(Long userId, String title, String message, String type) {
        try {
            User user = userRepo.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            UserNotification notification = new UserNotification();
            notification.setUser(user);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setIsRead(false);
            notification.setCreatedAt(LocalDateTime.now());

            UserNotification savedNotification = repository.save(notification);

            log.info("Notification created: id={}, userId={}, type={}",
                    savedNotification.getId(), userId, type);

            return savedNotification;
        } catch (Exception e) {
            log.error("Failed to create notification for userId={}, type={}: {}",
                    userId, type, e.getMessage(), e);
            throw e;
        }
    }

    // Mark notification as read
    public Optional<UserNotification> markAsRead(Long notificationId) {
        try {
            Optional<UserNotification> optional = repository.findById(notificationId);

            if (optional.isPresent()) {
                UserNotification notification = optional.get();
                notification.setIsRead(true);
                repository.save(notification);

                log.info("Notification marked as read: id={}, userId={}",
                        notificationId, notification.getUser().getId());
            } else {
                log.warn("Attempted to mark non-existent notification as read: id={}",
                        notificationId);
            }

            return optional;
        } catch (Exception e) {
            log.error("Failed to mark notification as read: id={}: {}",
                    notificationId, e.getMessage(), e);
            throw e;
        }
    }
}