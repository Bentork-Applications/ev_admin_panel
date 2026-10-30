package com.bentork.ev_system.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

import com.bentork.ev_system.dto.request.CreateCampaignRoundDTO;
import com.bentork.ev_system.dto.request.RetryFailedMessagesDTO;
import com.bentork.ev_system.dto.request.UpdateCampaignRoundDTO;
import com.bentork.ev_system.dto.response.CampaignMessageResponse;
import com.bentork.ev_system.dto.response.CampaignRoundResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.model.CampaignMessage;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.service.CampaignRoundService;
import com.bentork.ev_system.service.MessageDispatchService;

import lombok.RequiredArgsConstructor;

/**
 * Controller for configuring and executing messaging rounds within a WhatsApp Campaign (FR-08 to FR-16).
 */
@RestController
@RequestMapping("/api/crm/whatsapp-campaigns/{campaignId}/rounds")
@RequiredArgsConstructor
public class CampaignRoundController {

    private final CampaignRoundService roundService;
    private final MessageDispatchService dispatchService;
    private final CampaignMessageRepository messageRepository;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> addRound(
            @PathVariable Long campaignId,
            @RequestBody CreateCampaignRoundDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(roundService.addRound(campaignId, dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<CampaignRoundResponse>> getRounds(@PathVariable Long campaignId) {
        return ResponseEntity.ok(roundService.getRoundsForCampaign(campaignId));
    }

    @GetMapping("/{roundId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getRoundById(
            @PathVariable Long campaignId,
            @PathVariable Long roundId) {
        try {
            return ResponseEntity.ok(roundService.getRoundById(roundId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{roundId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateRound(
            @PathVariable Long campaignId,
            @PathVariable Long roundId,
            @RequestBody UpdateCampaignRoundDTO dto) {
        try {
            return ResponseEntity.ok(roundService.updateRound(campaignId, roundId, dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{roundId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteRound(
            @PathVariable Long campaignId,
            @PathVariable Long roundId) {
        try {
            roundService.deleteRound(campaignId, roundId, getCurrentUserEmail());
            return ResponseEntity.ok("Round deleted successfully");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{roundId}/send")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> triggerRoundSend(
            @PathVariable Long campaignId,
            @PathVariable Long roundId) {
        try {
            return ResponseEntity.ok(dispatchService.dispatchRound(campaignId, roundId, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Round dispatch failed: " + e.getMessage());
        }
    }

    @PostMapping("/{roundId}/retry")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> retryFailed(
            @PathVariable Long campaignId,
            @PathVariable Long roundId,
            @RequestBody(required = false) RetryFailedMessagesDTO dto) {
        try {
            List<Long> msgIds = dto != null ? dto.getMessageIds() : null;
            return ResponseEntity.ok(dispatchService.retryFailedMessages(campaignId, roundId, msgIds, getCurrentUserEmail()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{roundId}/messages")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getRoundMessages(
            @PathVariable Long campaignId,
            @PathVariable Long roundId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CampaignMessage> msgPage = messageRepository.findByRoundIdOrderByCreatedAtDesc(roundId, pageable);

        List<CampaignMessageResponse> content = msgPage.getContent().stream()
                .map(this::mapMessageToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(PagedResponse.of(
                content, page, size, msgPage.getTotalElements(), msgPage.getTotalPages(), msgPage.isLast()));
    }

    private CampaignMessageResponse mapMessageToResponse(CampaignMessage m) {
        return CampaignMessageResponse.builder()
                .id(m.getId())
                .membershipId(m.getMembership() != null ? m.getMembership().getId() : null)
                .roundId(m.getRound() != null ? m.getRound().getId() : null)
                .roundNumber(m.getRound() != null ? m.getRound().getRoundNumber() : null)
                .leadId(m.getLead() != null ? m.getLead().getId() : null)
                .leadNumber(m.getLead() != null ? m.getLead().getLeadNumber() : null)
                .contactName(m.getMembership() != null ? m.getMembership().getContactName() : null)
                .phone(m.getPhone())
                .providerMessageId(m.getProviderMessageId())
                .templateUsed(m.getTemplateUsed())
                .status(m.getStatus())
                .errorCode(m.getErrorCode())
                .errorMessage(m.getErrorMessage())
                .skipReason(m.getSkipReason())
                .queuedAt(m.getQueuedAt())
                .submittedAt(m.getSubmittedAt())
                .sentAt(m.getSentAt())
                .deliveredAt(m.getDeliveredAt())
                .readAt(m.getReadAt())
                .failedAt(m.getFailedAt())
                .retryCount(m.getRetryCount())
                .triggeredBy(m.getTriggeredBy())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }
}
