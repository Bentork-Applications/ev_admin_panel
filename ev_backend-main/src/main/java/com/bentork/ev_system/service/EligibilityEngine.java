package com.bentork.ev_system.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.CampaignMessage;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.repository.ContactSuppressionRepository;
import com.bentork.ev_system.util.PhoneNormalizationUtil;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Pre-send validation engine that evaluates whether a lead is eligible to receive
 * a message in a given campaign round.
 *
 * Implements FR-12, FR-21, FR-22, FR-23, BR-04, BR-06, BR-07.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EligibilityEngine {

    private final ContactSuppressionRepository suppressionRepository;
    private final CampaignMessageRepository messageRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EligibilityResult {
        private boolean eligible;
        private String skipReason;
        private String normalizedPhone;
    }

    /**
     * Re-checks all eligibility criteria before provider submission.
     */
    @Transactional(readOnly = true)
    public EligibilityResult checkEligibility(Campaign campaign, CampaignRound round, CampaignMembership membership) {
        // 1. Campaign must be ACTIVE
        if (campaign == null || !"ACTIVE".equalsIgnoreCase(campaign.getStatus())) {
            return notEligible("Campaign is not active (status: " + (campaign != null ? campaign.getStatus() : "null") + ")");
        }

        // 2. Round must be SCHEDULED or IN_PROGRESS
        if (round == null || (!"SCHEDULED".equalsIgnoreCase(round.getStatus()) && !"IN_PROGRESS".equalsIgnoreCase(round.getStatus()))) {
            return notEligible("Round is not in runnable state (status: " + (round != null ? round.getStatus() : "null") + ")");
        }

        // 3. Membership record must exist
        if (membership == null) {
            return notEligible("Campaign membership record is missing");
        }

        // 4. Membership eligibility status must be ELIGIBLE
        if (!"ELIGIBLE".equalsIgnoreCase(membership.getEligibilityStatus())) {
            return notEligible("Membership status is " + membership.getEligibilityStatus()
                    + (membership.getPauseReason() != null ? " (" + membership.getPauseReason() + ")" : ""));
        }

        // 5. Reply check: if member has already replied, pause-on-reply rule applies (FR-21)
        if (membership.isHasReplied()) {
            return notEligible("Contact has replied to campaign; future messaging paused");
        }

        Lead lead = membership.getLead();
        if (lead == null) {
            return notEligible("Canonical lead record is missing");
        }

        // 6. Lead-level opt-out check (FR-22)
        if (lead.isOptedOut()) {
            return notEligible("Contact opted out of messaging");
        }

        // 7. Lead conversion or disqualification stop condition (FR-23)
        if ("converted".equalsIgnoreCase(lead.getStatus()) || "lost".equalsIgnoreCase(lead.getStatus())) {
            return notEligible("Lead status is " + lead.getStatus() + "; automated campaign stopped");
        }

        // 8. Resolve phone number
        String phone = resolvePhone(membership, lead);
        if (phone == null || phone.trim().isEmpty()) {
            return notEligible("No phone number available for contact");
        }

        String normalizedPhone = PhoneNormalizationUtil.normalize(phone);
        if (!PhoneNormalizationUtil.isValid(normalizedPhone)) {
            return notEligible("Phone number is invalid or cannot be normalized: " + phone);
        }

        // 9. Contact suppression table check (global or campaign-scoped)
        List<String> scopes = Arrays.asList("GLOBAL", "CAMPAIGN_" + campaign.getId());
        if (suppressionRepository.existsByPhoneAndScopeIn(normalizedPhone, scopes)) {
            return notEligible("Phone number is on suppression / DNC list");
        }

        // 10. Prior successful submission check (Idempotency - BR-04, BR-06)
        String idempotencyKey = CampaignMessage.generateIdempotencyKey(campaign.getId(), round.getId(), lead.getId());
        if (messageRepository.existsByIdempotencyKey(idempotencyKey)) {
            CampaignMessage existing = messageRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            if (existing != null && (
                    "SUBMITTED".equalsIgnoreCase(existing.getStatus())
                    || "SENT".equalsIgnoreCase(existing.getStatus())
                    || "DELIVERED".equalsIgnoreCase(existing.getStatus())
                    || "READ".equalsIgnoreCase(existing.getStatus()))) {
                return notEligible("Round already submitted or delivered to this contact (status: " + existing.getStatus() + ")");
            }
        }

        return EligibilityResult.builder()
                .eligible(true)
                .skipReason(null)
                .normalizedPhone(normalizedPhone)
                .build();
    }

    private String resolvePhone(CampaignMembership membership, Lead lead) {
        if (membership.getPhone() != null && !membership.getPhone().trim().isEmpty()) {
            return membership.getPhone().trim();
        }
        if (lead.getPhone() != null && !lead.getPhone().trim().isEmpty()) {
            return lead.getPhone().trim();
        }
        if (lead.getContact() != null && lead.getContact().getPhone() != null) {
            return lead.getContact().getPhone().trim();
        }
        return null;
    }

    private EligibilityResult notEligible(String reason) {
        return EligibilityResult.builder()
                .eligible(false)
                .skipReason(reason)
                .normalizedPhone(null)
                .build();
    }
}
