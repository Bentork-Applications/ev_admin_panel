package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.service.IndiaMartService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/indiamart")
@RequiredArgsConstructor
@Slf4j
public class CrmIndiaMartController {

    private final IndiaMartService indiaMartService;

    @org.springframework.web.bind.annotation.PostMapping("/sync")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> syncLeads() {
        try {
            int count = indiaMartService.syncLeads();
            return ResponseEntity.ok("Successfully synced " + count + " new leads from IndiaMART.");
        } catch (Exception e) {
            log.error("Failed to sync leads from IndiaMART", e);
            return ResponseEntity.internalServerError().body("Error syncing leads: " + e.getMessage());
        }
    }
}
