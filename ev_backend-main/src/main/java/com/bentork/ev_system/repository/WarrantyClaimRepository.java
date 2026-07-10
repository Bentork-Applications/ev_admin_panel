package com.bentork.ev_system.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.WarrantyClaim;

@Repository
public interface WarrantyClaimRepository extends JpaRepository<WarrantyClaim, Long> {

    List<WarrantyClaim> findBySubmitterEmailOrderByCreatedAtDesc(String email);

    List<WarrantyClaim> findAllByOrderByCreatedAtDesc();

    List<WarrantyClaim> findByStatusOrderByCreatedAtDesc(String status);

    Optional<WarrantyClaim> findByIdAndSubmitterEmail(Long id, String email);

    List<WarrantyClaim> findByCompletedAtIsNotNull();

    List<WarrantyClaim> findByCompletedAtBetween(LocalDateTime from, LocalDateTime to);
}

