package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.UserNotification;

import java.util.List;
import java.util.Optional;

/**
 * Interface for user notification operations.
 */
public interface IUserNotificationService {
    UserNotification createNotification(Long userId, String title, String message, String type);
    List<UserNotification> getUserNotifications(Long userId);
    List<UserNotification> getUnreadNotifications(Long userId);
    Optional<UserNotification> markAsRead(Long notificationId);
}
