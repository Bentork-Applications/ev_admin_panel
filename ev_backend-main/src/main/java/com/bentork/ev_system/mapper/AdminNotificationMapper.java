package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.AdminNotificationDTO;
import com.bentork.ev_system.model.AdminNotification;

public class AdminNotificationMapper {

    public static AdminNotificationDTO toDTO(AdminNotification notification) {
        AdminNotificationDTO dto = new AdminNotificationDTO();
        dto.setId(notification.getId());
        dto.setAdminId(notification.getAdmin().getId());
        dto.setMessage(notification.getMessage());
        dto.setType(notification.getType());
        dto.setRead(notification.isRead());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }

    public static AdminNotification toEntity(AdminNotificationDTO dto) {
        AdminNotification notification = new AdminNotification();
        notification.setMessage(dto.getMessage());
        notification.setType(dto.getType());
        notification.setRead(dto.isRead());
        notification.setCreatedAt(dto.getCreatedAt());
        return notification;
    }
}
