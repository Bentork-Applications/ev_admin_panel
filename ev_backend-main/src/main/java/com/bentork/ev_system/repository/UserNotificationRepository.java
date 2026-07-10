package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserNotification;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    // Find all notifications for a given user
    List<UserNotification> findByUser(User user);

    // Find unread notifications
    List<UserNotification> findByUserAndIsReadFalse(User user);

}
