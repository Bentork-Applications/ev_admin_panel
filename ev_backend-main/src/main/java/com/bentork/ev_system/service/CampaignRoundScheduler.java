package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.enums.CampaignStatus;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.repository.CampaignRoundRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Scheduled background worker for automatic dispatch of due WhatsApp campaign rounds
 * and generation of operational reminders (FR-10, FR-11, FR-17).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignRoundScheduler {

    private final CampaignRoundRepository roundRepository;
    private final MessageDispatchService dispatchService;
    private final CampaignNotificationService notificationService;

    /**
     * Executes every 5 minutes to trigger due automatic rounds.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void executeDueAutomaticRounds() {
        LocalDate today = LocalDate.now();
        LocalTime nowTime = LocalTime.now();

        List<CampaignRound> dueRounds = roundRepository.findByStatusAndPlannedDateLessThanEqual(
                CampaignRoundStatus.SCHEDULED.getValue(), today);

        for (CampaignRound round : dueRounds) {
            Campaign campaign = round.getCampaign();

            // Only dispatch if campaign is ACTIVE and round is configured for AUTOMATIC sending
            if (campaign == null || !CampaignStatus.ACTIVE.getValue().equalsIgnoreCase(campaign.getStatus())) {
                continue;
            }

            if (!"AUTOMATIC".equalsIgnoreCase(round.getSendMode())) {
                continue; // Manual rounds require explicit user trigger
            }

            // If planned for today, check whether the planned time has arrived
            if (today.equals(round.getPlannedDate()) && round.getPlannedTime() != null) {
                if (nowTime.isBefore(round.getPlannedTime())) {
                    continue; // Not yet time to dispatch
                }
            }

            try {
                log.info("Campaign Round Scheduler: Auto-dispatching Campaign '{}' Round {} (ID: {})",
                        campaign.getName(), round.getRoundNumber(), round.getId());
                dispatchService.dispatchRound(campaign.getId(), round.getId(), "SYSTEM_SCHEDULER");
            } catch (Exception e) {
                log.error("Campaign Round Scheduler: Failed to auto-dispatch Campaign '{}' Round {}: {}",
                        campaign.getName(), round.getRoundNumber(), e.getMessage(), e);
            }
        }
    }

    /**
     * Runs hourly to generate reminders and overdue notices (FR-17, BRD Section 11).
     */
    @Scheduled(fixedRate = 3600000) // 1 hour
    public void generateRoundReminders() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        // 1. Upcoming rounds due within 24 hours
        List<CampaignRound> upcoming = roundRepository.findByPlannedDateBetweenAndStatusInOrderByPlannedDateAsc(
                today, tomorrow, List.of(CampaignRoundStatus.SCHEDULED.getValue()));

        for (CampaignRound round : upcoming) {
            if (round.getCampaign() != null && CampaignStatus.ACTIVE.getValue().equalsIgnoreCase(round.getCampaign().getStatus())) {
                notificationService.notifyRoundDue(round.getCampaign(), round, false);
            }
        }

        // 2. Overdue rounds (planned in past, but not completed or cancelled)
        List<String> finishedStatuses = Arrays.asList(
                CampaignRoundStatus.COMPLETED.getValue(),
                CampaignRoundStatus.CANCELLED.getValue());

        List<CampaignRound> overdue = roundRepository.findByPlannedDateBeforeAndStatusNotInOrderByPlannedDateAsc(
                today, finishedStatuses);

        for (CampaignRound round : overdue) {
            if (round.getCampaign() != null) {
                notificationService.notifyRoundDue(round.getCampaign(), round, true);
            }
        }
    }
}
