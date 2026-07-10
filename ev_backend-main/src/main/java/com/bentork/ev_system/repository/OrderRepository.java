package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // User queries
    List<Order> findByAssignedToUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findByAssignedToUserEmailOrderByCreatedAtDesc(String email);
    Optional<Order> findByIdAndAssignedToUserEmail(Long id, String email);

    // Admin queries
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByStatusOrderByCreatedAtDesc(String status);
    Optional<Order> findByOrderNumber(String orderNumber);

    // Stats
    long countByStatus(String status);
    long countByAssignedToUserId(Long userId);
}
