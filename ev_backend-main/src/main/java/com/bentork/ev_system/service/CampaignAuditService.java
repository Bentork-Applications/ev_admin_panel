package com.bentork.ev_system.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.CampaignAuditLog;
import com.bentork.ev_system.repository.CampaignAuditLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for creating and querying campaign audit logs.
 * Implements FR-26 (Audit trail) and BR-09.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignAuditService {

    private final CampaignAuditLogRepository auditLogRepository;

    @Transactional
    public void log(Long campaignId, Long roundId, Long membershipId, Long leadId,
                    String action, String details, String performedBy) {
        try {
            CampaignAuditLog logEntry = new CampaignAuditLog();
            logEntry.setCampaignId(campaignId);
            logEntry.setRoundId(roundId);
            logEntry.setMembershipId(membershipId);
            logEntry.setLeadId(leadId);
            logEntry.setAction(action);
            logEntry.setDetails(details);
            logEntry.setPerformedBy(performedBy != null ? performedBy : "SYSTEM");
            logEntry.setTimestamp(LocalDateTime.now());

            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Failed to persist campaign audit log: {}", e.getMessage(), e);
        }
    }

    public void logCampaign(Long campaignId, String action, String details, String performedBy) {
        log(campaignId, null, null, null, action, details, performedBy);
    }

    public void logRound(Long campaignId, Long roundId, String action, String details, String performedBy) {
        log(campaignId, roundId, null, null, action, details, performedBy);
    }

    public void logMembership(Long campaignId, Long membershipId, Long leadId, String action, String details, String performedBy) {
        log(campaignId, null, membershipId, leadId, action, details, performedBy);
    }
}
