package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.LogActivityDTO;
import com.bentork.ev_system.dto.response.ActivityResponse;
import com.bentork.ev_system.service.ActivityService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/activities")
@RequiredArgsConstructor
@Slf4j
public class CrmActivityController {

    private final ActivityService activityService;

    @PostMapping("/log")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> logActivity(@RequestBody LogActivityDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(activityService.logActivity(dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/lead/{leadId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ActivityResponse>> getActivitiesForLead(@PathVariable Long leadId) {
        return ResponseEntity.ok(activityService.getActivitiesForLead(leadId));
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ActivityResponse>> getActivitiesForCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(activityService.getActivitiesForCompany(companyId));
    }

    @GetMapping("/opportunity/{opportunityId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ActivityResponse>> getActivitiesForOpportunity(@PathVariable Long opportunityId) {
        return ResponseEntity.ok(activityService.getActivitiesForOpportunity(opportunityId));
    }

    @GetMapping("/my-today")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ActivityResponse>> getTodayActivities() {
        return ResponseEntity.ok(activityService.getTodayActivities(getCurrentUserEmail()));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
