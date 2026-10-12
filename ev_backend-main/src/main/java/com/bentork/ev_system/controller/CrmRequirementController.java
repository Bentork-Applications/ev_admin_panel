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

import com.bentork.ev_system.dto.request.CreateRequirementDTO;
import com.bentork.ev_system.dto.request.UpdateRequirementDTO;
import com.bentork.ev_system.dto.response.RequirementResponse;
import com.bentork.ev_system.service.RequirementService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/crm/requirements")
@RequiredArgsConstructor
public class CrmRequirementController {

    private final RequirementService requirementService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createRequirement(@RequestBody CreateRequirementDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(requirementService.createRequirement(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<RequirementResponse>> getAllRequirements() {
        return ResponseEntity.ok(requirementService.getAllRequirements());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getRequirementById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(requirementService.getRequirementById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/lead/{leadId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<RequirementResponse>> getRequirementsByLeadId(@PathVariable Long leadId) {
        return ResponseEntity.ok(requirementService.getRequirementsByLeadId(leadId));
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<RequirementResponse>> getRequirementsByCompanyId(@PathVariable Long companyId) {
        return ResponseEntity.ok(requirementService.getRequirementsByCompanyId(companyId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateRequirement(@PathVariable Long id, @RequestBody UpdateRequirementDTO dto) {
        try {
            return ResponseEntity.ok(requirementService.updateRequirement(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteRequirement(@PathVariable Long id) {
        try {
            requirementService.deleteRequirement(id);
            return ResponseEntity.ok("Requirement deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
