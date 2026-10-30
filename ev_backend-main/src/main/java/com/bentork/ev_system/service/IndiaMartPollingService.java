package com.bentork.ev_system.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndiaMartPollingService {

    private final IndiaMartService indiaMartService;

    // Run every 15 minutes
    @Scheduled(fixedRate = 900000)
    public void pollIndiaMartLeads() {
        log.info("Starting scheduled IndiaMART lead polling...");
        try {
            int processedCount = indiaMartService.syncLeads();
            if (processedCount > 0) {
                log.info("Scheduled IndiaMART polling completed. Processed {} new leads.", processedCount);
            }
        } catch (Exception e) {
            log.error("Error during scheduled IndiaMART lead polling", e);
        }
    }
}
