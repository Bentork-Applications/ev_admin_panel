package com.bentork.ev_system.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesContactRepository;
import com.bentork.ev_system.util.PhoneNormalizationUtil;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for matching imported contacts against existing canonical Leads in CRM.
 * Implements FR-05 (Duplicate matching) and BR-01 (Single canonical lead record).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DuplicateMatchingService {

    private final LeadRepository leadRepository;
    private final SalesContactRepository salesContactRepository;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchResult {
        private boolean matched;
        private String matchType; // "DIRECT_LEAD_PHONE", "CONTACT_PHONE", "NONE"
        private Lead matchedLead;
        private SalesContact matchedContact;
        private String normalizedPhone;
    }

    /**
     * Finds any existing Lead that corresponds to the given phone number.
     * Checks:
     * 1. Direct phone on Lead (both normalized E.164 and 10-digit variant)
     * 2. Phone on associated SalesContact
     */
    @Transactional(readOnly = true)
    public MatchResult matchByPhone(String rawPhone) {
        String normalized = PhoneNormalizationUtil.normalize(rawPhone);
        if (normalized == null || normalized.isEmpty()) {
            return MatchResult.builder()
                    .matched(false)
                    .matchType("NONE")
                    .normalizedPhone(null)
                    .build();
        }

        // 1. Check direct lead phone (normalized)
        Optional<Lead> leadOpt = leadRepository.findFirstByPhoneOrderByCreatedAtDesc(normalized);
        if (leadOpt.isPresent()) {
            return MatchResult.builder()
                    .matched(true)
                    .matchType("DIRECT_LEAD_PHONE")
                    .matchedLead(leadOpt.get())
                    .normalizedPhone(normalized)
                    .build();
        }

        // If normalized starts with 91 and has 12 digits, also check 10-digit variant
        if (normalized.startsWith("91") && normalized.length() == 12) {
            String tenDigit = normalized.substring(2);
            leadOpt = leadRepository.findFirstByPhoneOrderByCreatedAtDesc(tenDigit);
            if (leadOpt.isPresent()) {
                return MatchResult.builder()
                        .matched(true)
                        .matchType("DIRECT_LEAD_PHONE")
                        .matchedLead(leadOpt.get())
                        .normalizedPhone(normalized)
                        .build();
            }
        }

        // 2. Check associated SalesContact
        leadOpt = leadRepository.findFirstByContactPhoneOrderByCreatedAtDesc(normalized);
        if (leadOpt.isPresent()) {
            return MatchResult.builder()
                    .matched(true)
                    .matchType("CONTACT_PHONE")
                    .matchedLead(leadOpt.get())
                    .matchedContact(leadOpt.get().getContact())
                    .normalizedPhone(normalized)
                    .build();
        }

        if (normalized.startsWith("91") && normalized.length() == 12) {
            String tenDigit = normalized.substring(2);
            leadOpt = leadRepository.findFirstByContactPhoneOrderByCreatedAtDesc(tenDigit);
            if (leadOpt.isPresent()) {
                return MatchResult.builder()
                        .matched(true)
                        .matchType("CONTACT_PHONE")
                        .matchedLead(leadOpt.get())
                        .matchedContact(leadOpt.get().getContact())
                        .normalizedPhone(normalized)
                        .build();
            }
        }

        // 3. Check standalone SalesContact that might not have a Lead yet
        Optional<SalesContact> contactOpt = salesContactRepository.findByPhone(normalized);
        if (contactOpt.isPresent()) {
            return MatchResult.builder()
                    .matched(true)
                    .matchType("SALES_CONTACT_ONLY")
                    .matchedContact(contactOpt.get())
                    .normalizedPhone(normalized)
                    .build();
        }

        return MatchResult.builder()
                .matched(false)
                .matchType("NONE")
                .normalizedPhone(normalized)
                .build();
    }
}
