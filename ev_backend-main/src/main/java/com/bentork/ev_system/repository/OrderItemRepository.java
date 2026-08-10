package com.bentork.ev_system.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bentork.ev_system.model.OrderItem;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
}
