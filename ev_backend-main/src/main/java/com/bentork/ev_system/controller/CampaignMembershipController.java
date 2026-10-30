package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.bentork.ev_system.dto.request.AddLeadsToCampaignDTO;
import com.bentork.ev_system.dto.request.CampaignImportConfirmDTO;
import com.bentork.ev_system.dto.request.PauseMembershipDTO;
import com.bentork.ev_system.dto.response.CampaignMembershipResponse;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.service.CampaignImportService;
import com.bentork.ev_system.service.CampaignMembershipService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for managing campaign leads, import preview/confirm, and individual membership states (FR-03 to FR-07, BR-08).
 */
@RestController
@RequestMapping("/api/crm/whatsapp-campaigns/{campaignId}/leads")
@RequiredArgsConstructor
public class CampaignMembershipController {

    private final CampaignMembershipService membershipService;
    private final CampaignImportService importService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> addExistingLeads(
            @PathVariable Long campaignId,
            @RequestBody AddLeadsToCampaignDTO dto) {
        try {
            List<CampaignMembershipResponse> members = membershipService.addLeadsToCampaign(
                    campaignId, dto.getLeadIds(), dto.getTargetOwnerAdminId(), getCurrentUserEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(members);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getCampaignMembers(
            @PathVariable Long campaignId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(membershipService.getCampaignMembers(campaignId, status, page, size));
    }

    @PostMapping(value = "/import/preview", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> previewImport(
            @PathVariable Long campaignId,
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(importService.previewImport(campaignId, file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/import/confirm")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> confirmImport(
            @PathVariable Long campaignId,
            @RequestBody CampaignImportConfirmDTO dto) {
        try {
            List<CampaignMembership> created = importService.confirmImport(campaignId, dto, getCurrentUserEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(created.size() + " contacts imported successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{membershipId}/pause")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> pauseMembership(
            @PathVariable Long campaignId,
            @PathVariable Long membershipId,
            @RequestBody(required = false) PauseMembershipDTO dto) {
        try {
            String reason = dto != null ? dto.getReason() : "MANUAL";
            return ResponseEntity.ok(membershipService.pauseMembership(membershipId, reason, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{membershipId}/resume")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> resumeMembership(
            @PathVariable Long campaignId,
            @PathVariable Long membershipId) {
        try {
            return ResponseEntity.ok(membershipService.resumeMembership(membershipId, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{membershipId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> removeMembership(
            @PathVariable Long campaignId,
            @PathVariable Long membershipId) {
        try {
            membershipService.removeMembership(membershipId, getCurrentUserEmail());
            return ResponseEntity.ok("Member removed from campaign successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }
}
