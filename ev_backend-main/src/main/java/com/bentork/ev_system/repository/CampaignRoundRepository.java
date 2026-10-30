package com.bentork.ev_system.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CampaignRound;

@Repository
public interface CampaignRoundRepository extends JpaRepository<CampaignRound, Long> {

    List<CampaignRound> findByCampaignIdOrderByRoundNumberAsc(Long campaignId);

    Optional<CampaignRound> findByCampaignIdAndRoundNumber(Long campaignId, Integer roundNumber);

    List<CampaignRound> findByCampaignIdAndStatus(Long campaignId, String status);

    // Find rounds that are due for automatic dispatch
    List<CampaignRound> findByStatusAndPlannedDateLessThanEqual(String status, LocalDate date);

    // Find rounds with specific statuses across all campaigns
    List<CampaignRound> findByStatusInOrderByPlannedDateAsc(List<String> statuses);

    // Count rounds by campaign
    long countByCampaignId(Long campaignId);

    long countByCampaignIdAndStatus(Long campaignId, String status);

    // Find overdue rounds (planned date in the past, not completed/cancelled)
    List<CampaignRound> findByPlannedDateBeforeAndStatusNotInOrderByPlannedDateAsc(
            LocalDate date, List<String> excludedStatuses);

    // Find upcoming rounds for reminders
    List<CampaignRound> findByPlannedDateBetweenAndStatusInOrderByPlannedDateAsc(
            LocalDate start, LocalDate end, List<String> statuses);
}
