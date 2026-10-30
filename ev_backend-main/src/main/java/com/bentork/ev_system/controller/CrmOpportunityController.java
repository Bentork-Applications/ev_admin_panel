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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateOpportunityDTO;
import com.bentork.ev_system.dto.request.UpdateOpportunityStageDTO;
import com.bentork.ev_system.dto.response.OpportunityResponse;
import com.bentork.ev_system.service.OpportunityService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/opportunities")
@RequiredArgsConstructor
@Slf4j
public class CrmOpportunityController {

    private final OpportunityService opportunityService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createOpportunity(@RequestBody CreateOpportunityDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(opportunityService.createOpportunity(dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/kanban")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<OpportunityResponse>> getKanbanData() {
        return ResponseEntity.ok(opportunityService.getKanbanData());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<OpportunityResponse>> getAllOpportunities() {
        return ResponseEntity.ok(opportunityService.getAllOpportunities());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getOpportunityById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(opportunityService.getOpportunityById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/stage")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateStage(@PathVariable Long id, @RequestBody UpdateOpportunityStageDTO dto) {
        try {
            return ResponseEntity.ok(opportunityService.updateStage(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/pipeline-value")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<Double> getPipelineValue() {
        return ResponseEntity.ok(opportunityService.getWeightedPipelineValue());
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
