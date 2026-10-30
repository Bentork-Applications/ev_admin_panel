package com.bentork.ev_system.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateWhatsAppCampaignDTO;
import com.bentork.ev_system.dto.request.PauseMembershipDTO;
import com.bentork.ev_system.dto.request.UpdateWhatsAppCampaignDTO;
import com.bentork.ev_system.dto.response.CampaignAuditLogResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.model.CampaignAuditLog;
import com.bentork.ev_system.repository.CampaignAuditLogRepository;
import com.bentork.ev_system.service.WhatsAppCampaignService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for managing WhatsApp Campaigns (FR-01, FR-02, FR-26, FR-27, FR-29).
 */
@RestController
@RequestMapping("/api/crm/whatsapp-campaigns")
@RequiredArgsConstructor
public class WhatsAppCampaignController {

    private final WhatsAppCampaignService campaignService;
    private final CampaignAuditLogRepository auditLogRepository;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createCampaign(@RequestBody CreateWhatsAppCampaignDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(campaignService.createCampaign(dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getAllCampaigns(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(campaignService.getAllCampaigns(status, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getCampaignById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(campaignService.getCampaignById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateCampaign(
            @PathVariable Long id,
            @RequestBody UpdateWhatsAppCampaignDTO dto) {
        try {
            return ResponseEntity.ok(campaignService.updateCampaign(id, dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> activateCampaign(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(campaignService.activateCampaign(id, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/pause")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> pauseCampaign(
            @PathVariable Long id,
            @RequestBody(required = false) PauseMembershipDTO dto) {
        try {
            String reason = dto != null ? dto.getReason() : "MANUAL_PAUSE";
            return ResponseEntity.ok(campaignService.pauseCampaign(id, reason, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/resume")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> resumeCampaign(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(campaignService.resumeCampaign(id, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> cancelCampaign(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(campaignService.cancelCampaign(id, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/audit-log")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getCampaignAuditLog(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CampaignAuditLog> logs = auditLogRepository.findByCampaignIdOrderByTimestampDesc(id, pageable);

        Page<CampaignAuditLogResponse> responsePage = logs.map(l -> CampaignAuditLogResponse.builder()
                .id(l.getId())
                .campaignId(l.getCampaignId())
                .roundId(l.getRoundId())
                .membershipId(l.getMembershipId())
                .leadId(l.getLeadId())
                .action(l.getAction())
                .details(l.getDetails())
                .performedBy(l.getPerformedBy())
                .timestamp(l.getTimestamp())
                .build());

        return ResponseEntity.ok(PagedResponse.of(
                responsePage.getContent(), page, size,
                responsePage.getTotalElements(), responsePage.getTotalPages(), responsePage.isLast()));
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }
}
