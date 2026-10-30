package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.repository.CampaignRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Scheduled background service for automated dispatch of due CRM campaigns.
 * Evaluates campaigns with status = 'SCHEDULED' and scheduledDate <= today.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignSchedulerService {

    private final CampaignRepository campaignRepository;
    private final CampaignService campaignService;

    /**
     * Hourly scheduled check for due campaigns.
     */
    @Scheduled(fixedRate = 3600000) // Every hour
    public void executeScheduledCampaigns() {
        LocalDate today = LocalDate.now();
        List<Campaign> dueCampaigns = campaignRepository.findByStatusAndScheduledDateLessThanEqual("SCHEDULED", today);

        if (dueCampaigns.isEmpty()) {
            return;
        }

        log.info("Campaign Scheduler: Found {} due campaigns scheduled for dispatch on or before {}", dueCampaigns.size(), today);

        for (Campaign campaign : dueCampaigns) {
            try {
                log.info("Campaign Scheduler: Auto-dispatching campaign '{}' (ID: {})", campaign.getName(), campaign.getId());
                campaignService.sendCampaign(campaign.getId(), "SYSTEM_SCHEDULER");
            } catch (Exception e) {
                log.error("Campaign Scheduler: Failed to auto-dispatch campaign '{}' (ID: {}): {}",
                        campaign.getName(), campaign.getId(), e.getMessage());
            }
        }
    }
}
