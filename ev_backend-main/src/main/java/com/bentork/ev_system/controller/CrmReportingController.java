package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.response.LeadConversionReportDTO;
import com.bentork.ev_system.dto.response.RevenueReportDTO;
import com.bentork.ev_system.dto.response.SalesPerformanceDTO;
import com.bentork.ev_system.service.CrmReportingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/crm/reports")
@RequiredArgsConstructor
public class CrmReportingController {

    private final CrmReportingService crmReportingService;

    @GetMapping("/conversions")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<LeadConversionReportDTO> getLeadConversions() {
        return ResponseEntity.ok(crmReportingService.getLeadConversionReport());
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<RevenueReportDTO> getRevenueReport() {
        return ResponseEntity.ok(crmReportingService.getRevenueReport());
    }

    @GetMapping("/performance/{adminId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getAdminPerformance(@PathVariable Long adminId) {
        try {
            return ResponseEntity.ok(crmReportingService.getAdminPerformance(adminId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
