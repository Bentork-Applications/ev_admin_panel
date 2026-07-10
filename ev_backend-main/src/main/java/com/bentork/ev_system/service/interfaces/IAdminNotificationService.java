package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.AdminNotificationDTO;

import java.util.List;

/**
 * Interface for admin notification operations.
 */
public interface IAdminNotificationService {
    void createSystemNotification(String message, String type);
    void notifyNewUserRegistration(String userName);
    List<AdminNotificationDTO> getNotificationsByAdminId(Long adminId);
    void markAsRead(Long notificationId);
}
