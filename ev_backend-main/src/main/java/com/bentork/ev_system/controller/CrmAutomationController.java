package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateAutomationRuleDTO;
import com.bentork.ev_system.dto.response.AutomationRuleResponse;
import com.bentork.ev_system.service.AutomationRuleService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/crm/settings/automation")
@RequiredArgsConstructor
public class CrmAutomationController {

    private final AutomationRuleService automationRuleService;
    private final com.bentork.ev_system.service.CrmAutomationExecutionService crmAutomationExecutionService;

    @PostMapping("/execute")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> executeRulesManually() {
        return ResponseEntity.ok(crmAutomationExecutionService.executeAllActiveRules());
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<AutomationRuleResponse> createRule(@Valid @RequestBody CreateAutomationRuleDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(automationRuleService.createRule(dto));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AutomationRuleResponse>> getAllRules() {
        return ResponseEntity.ok(automationRuleService.getAllRules());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateRule(@PathVariable Long id, @Valid @RequestBody CreateAutomationRuleDTO dto) {
        try {
            return ResponseEntity.ok(automationRuleService.updateRule(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteRule(@PathVariable Long id) {
        try {
            automationRuleService.deleteRule(id);
            return ResponseEntity.ok("Rule deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to delete rule: " + e.getMessage());
        }
    }
}
