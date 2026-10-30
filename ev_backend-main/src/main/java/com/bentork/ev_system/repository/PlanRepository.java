package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    java.util.List<Plan> findByIsActiveTrue();
}
