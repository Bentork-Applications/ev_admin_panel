package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Campaign;

@Repository
public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    List<Campaign> findAllByOrderByCreatedAtDesc();

    org.springframework.data.domain.Page<Campaign> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    List<Campaign> findByStatusOrderByCreatedAtDesc(String status);

    org.springframework.data.domain.Page<Campaign> findByStatusOrderByCreatedAtDesc(String status, org.springframework.data.domain.Pageable pageable);

    List<Campaign> findByStatusAndScheduledDateLessThanEqual(String status, java.time.LocalDate date);
}
