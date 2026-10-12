package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Order;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Sales Admin queries — orders created by a specific admin
    List<Order> findByCreatedByAdminEmailOrderByCreatedAtDesc(String email);

    // Production Admin queries — orders by production status
    List<Order> findByProductionStatusInOrderByCreatedAtDesc(List<String> statuses);
    List<Order> findByProductionStatusOrderByCreatedAtDesc(String productionStatus);

    // SCM Admin queries — orders where production is completed, or already processed by SCM
    List<Order> findByOrderStatusInOrderByCreatedAtDesc(List<String> orderStatuses);

    // User queries — orders by assigned user id
    List<Order> findByAssignedUserIdOrderByCreatedAtDesc(Long assignedUserId);

    // General queries
    List<Order> findAllByOrderByCreatedAtDesc();
    List<Order> findByOrderStatusOrderByCreatedAtDesc(String orderStatus);
    Optional<Order> findByOrderNumber(String orderNumber);
    Optional<Order> findByPiNumber(String piNumber);

    // Ownership check — verify invoice belongs to a user's order
    boolean existsByInvoiceNumberAndAssignedUserId(String invoiceNumber, Long assignedUserId);

    // Stats
    long countByOrderStatus(String orderStatus);
    long countByProductionStatus(String productionStatus);

    // Nullify assigned user on orders when user deletes account (used for account deletion)
    @Modifying
    @Query("UPDATE Order o SET o.assignedUserId = null WHERE o.assignedUserId = :userId")
    void nullifyAssignedUser(@Param("userId") Long userId);
}
