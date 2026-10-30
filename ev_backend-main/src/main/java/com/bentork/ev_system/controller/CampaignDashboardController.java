package com.bentork.ev_system.controller;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.response.CampaignDashboardResponse;
import com.bentork.ev_system.dto.response.CampaignRoundResponse;
import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.repository.CampaignRoundRepository;
import com.bentork.ev_system.service.CampaignReportService;
import com.bentork.ev_system.service.CampaignRoundService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for campaign analytics, dashboard KPIs, round compliance, and campaign reports (FR-25, Section 12).
 */
@RestController
@RequestMapping("/api/crm/whatsapp-campaigns")
@RequiredArgsConstructor
public class CampaignDashboardController {

    private final CampaignReportService reportService;
    private final CampaignRoundRepository roundRepository;
    private final CampaignRoundService roundService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<CampaignDashboardResponse> getDashboard() {
        return ResponseEntity.ok(reportService.getDashboardMetrics());
    }

    @GetMapping("/{id}/report")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getCampaignReport(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reportService.getCampaignReport(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/due-rounds")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<CampaignRoundResponse>> getDueAndOverdueRounds() {
        LocalDate today = LocalDate.now();

        // 1. Due rounds (scheduled for today or earlier)
        List<CampaignRound> due = roundRepository.findByStatusAndPlannedDateLessThanEqual(
                CampaignRoundStatus.SCHEDULED.getValue(), today);

        // 2. Overdue rounds (planned before today, not completed/cancelled)
        List<String> finishedStatuses = Arrays.asList(
                CampaignRoundStatus.COMPLETED.getValue(),
                CampaignRoundStatus.CANCELLED.getValue());

        List<CampaignRound> overdue = roundRepository.findByPlannedDateBeforeAndStatusNotInOrderByPlannedDateAsc(
                today, finishedStatuses);

        // Merge without duplicates
        due.addAll(overdue.stream().filter(r -> !due.contains(r)).collect(Collectors.toList()));

        return ResponseEntity.ok(due.stream()
                .map(roundService::mapToResponse)
                .collect(Collectors.toList()));
    }
}
