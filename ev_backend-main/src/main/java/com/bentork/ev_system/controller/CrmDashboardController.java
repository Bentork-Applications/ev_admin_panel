package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.response.CrmDashboardResponse;
import com.bentork.ev_system.service.CrmDashboardService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/dashboard")
@RequiredArgsConstructor
@Slf4j
public class CrmDashboardController {

    private final CrmDashboardService dashboardService;

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<CrmDashboardResponse> getDashboardKPIs() {
        return ResponseEntity.ok(dashboardService.getDashboardKPIs());
    }
}
