package com.bentork.ev_system.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CampaignAuditLog;

@Repository
public interface CampaignAuditLogRepository extends JpaRepository<CampaignAuditLog, Long> {

    // Campaign-level audit trail
    Page<CampaignAuditLog> findByCampaignIdOrderByTimestampDesc(Long campaignId, Pageable pageable);

    List<CampaignAuditLog> findByCampaignIdOrderByTimestampDesc(Long campaignId);

    // Filter by action type
    List<CampaignAuditLog> findByActionOrderByTimestampDesc(String action);

    Page<CampaignAuditLog> findByCampaignIdAndActionOrderByTimestampDesc(
            Long campaignId, String action, Pageable pageable);

    // Filter by performer
    List<CampaignAuditLog> findByPerformedByOrderByTimestampDesc(String performedBy);

    // Lead-specific audit
    List<CampaignAuditLog> findByLeadIdOrderByTimestampDesc(Long leadId);

    // Round-specific audit
    List<CampaignAuditLog> findByRoundIdOrderByTimestampDesc(Long roundId);

    // Time-range queries
    List<CampaignAuditLog> findByCampaignIdAndTimestampBetweenOrderByTimestampDesc(
            Long campaignId, LocalDateTime start, LocalDateTime end);
}
