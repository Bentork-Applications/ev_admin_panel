package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.UserPlanSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPlanSelectionRepository extends JpaRepository<UserPlanSelection, Long> {

    List<UserPlanSelection> findByUserId(Long userId);

    Optional<UserPlanSelection> findByUserIdAndIsActiveTrue(Long userId);
}
