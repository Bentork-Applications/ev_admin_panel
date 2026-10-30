package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CampaignMessage;

@Repository
public interface CampaignMessageRepository extends JpaRepository<CampaignMessage, Long> {

    // Find messages by round
    List<CampaignMessage> findByRoundId(Long roundId);

    List<CampaignMessage> findByRoundIdAndStatus(Long roundId, String status);

    Page<CampaignMessage> findByRoundIdOrderByCreatedAtDesc(Long roundId, Pageable pageable);

    // Find messages by membership (lead's history within a campaign)
    List<CampaignMessage> findByMembershipIdOrderByCreatedAtDesc(Long membershipId);

    // Find messages by lead across all campaigns
    List<CampaignMessage> findByLeadIdOrderByCreatedAtDesc(Long leadId);

    // Webhook lookup: find message by provider message ID
    Optional<CampaignMessage> findByProviderMessageId(String providerMessageId);

    // Idempotency check: does a message already exist for this key?
    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<CampaignMessage> findByIdempotencyKey(String idempotencyKey);

    // Count by round and status for round progress tracking
    long countByRoundIdAndStatus(Long roundId, String status);

    long countByRoundIdAndStatusIn(Long roundId, List<String> statuses);

    // Find retryable failures
    List<CampaignMessage> findByRoundIdAndStatusAndRetryCountLessThan(
            Long roundId, String status, Integer maxRetries);

    // Find messages with specific statuses in a round
    List<CampaignMessage> findByRoundIdAndStatusIn(Long roundId, List<String> statuses);

    // Count by campaign for aggregate stats
    long countByMembershipCampaignIdAndStatus(Long campaignId, String status);

    long countByMembershipCampaignIdAndStatusIn(Long campaignId, List<String> statuses);
}
