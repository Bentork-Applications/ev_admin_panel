package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.AdminNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {
    List<AdminNotification> findByAdminId(Long adminId);
}
