package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;

import com.bentork.ev_system.exception.ConsentRequiredException;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserConsent;
import com.bentork.ev_system.model.enums.ConsentType;
import com.bentork.ev_system.repository.UserConsentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Central service for managing user consent under DPDPA.
 * Handles granting, withdrawing, and querying consent records.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConsentService {

    private final UserConsentRepository consentRepository;

    private static final String CONSENT_VERSION = "1.0";

    // Consent text snapshots — update these when privacy policy changes and bump version
    private static final String TERMS_CONSENT_TEXT =
            "I agree to the Terms and Conditions and Privacy Policy of Bentork EV Charging Platform.";
    private static final String DATA_PROCESSING_CONSENT_TEXT =
            "I consent to the collection and processing of my personal data (name, email, mobile number) " +
            "for the purpose of providing EV charging services, as described in the Privacy Policy.";
    private static final String PUSH_NOTIFICATION_CONSENT_TEXT =
            "I consent to receiving push notifications about charging session updates, " +
            "booking reminders, and service alerts.";
    private static final String MARKETING_CONSENT_TEXT =
            "I consent to receiving marketing communications and promotional offers.";

    /**
     * Validates that the mandatory registration consents are provided.
     * Throws ConsentRequiredException if either is missing.
     */
    public void validateRegistrationConsent(boolean consentToTerms, boolean consentToDataProcessing) {
        if (!consentToTerms) {
            throw new ConsentRequiredException(
                    "You must accept the Terms and Conditions to register. " +
                    "This is required under the Digital Personal Data Protection Act (DPDPA).");
        }
        if (!consentToDataProcessing) {
            throw new ConsentRequiredException(
                    "You must consent to data processing to register. " +
                    "This is required under the Digital Personal Data Protection Act (DPDPA).");
        }
    }

    /**
     * Grants both TERMS_AND_CONDITIONS and DATA_PROCESSING consent at registration.
     */
    @Transactional
    public void grantRegistrationConsents(User user, String ipAddress) {
        grantConsent(user, ConsentType.TERMS_AND_CONDITIONS, ipAddress);
        grantConsent(user, ConsentType.DATA_PROCESSING, ipAddress);
        log.info("Registration consents recorded for user: {} (id: {})", PiiMaskingUtil.maskEmail(user.getEmail()), user.getId());
    }

    /**
     * Grants a specific consent type for a user.
     * If a withdrawn record exists for this type, it is re-granted.
     * If an active record already exists, it is left unchanged.
     */
    @Transactional
    public void grantConsent(User user, ConsentType consentType, String ipAddress) {
        Optional<UserConsent> existing = consentRepository.findByUserAndConsentType(user, consentType);

        if (existing.isPresent()) {
            UserConsent consent = existing.get();
            if (consent.getGranted()) {
                log.debug("Consent {} already active for user {}", consentType, user.getId());
                return; // Already granted, no action needed
            }
            // Re-grant previously withdrawn consent
            consent.setGranted(true);
            consent.setGrantedAt(LocalDateTime.now());
            consent.setWithdrawnAt(null);
            consent.setIpAddress(ipAddress);
            consent.setVersion(CONSENT_VERSION);
            consent.setConsentText(getConsentText(consentType));
            consentRepository.save(consent);
            log.info("Consent {} re-granted for user {}", consentType, user.getId());
        } else {
            // Create new consent record
            UserConsent consent = new UserConsent();
            consent.setUser(user);
            consent.setConsentType(consentType);
            consent.setGranted(true);
            consent.setConsentText(getConsentText(consentType));
            consent.setIpAddress(ipAddress);
            consent.setGrantedAt(LocalDateTime.now());
            consent.setVersion(CONSENT_VERSION);
            consentRepository.save(consent);
            log.info("Consent {} granted for user {}", consentType, user.getId());
        }
    }

    /**
     * Withdraws a specific consent type for a user.
     * Sets granted to false and records the withdrawal timestamp.
     */
    @Transactional
    public void withdrawConsent(User user, ConsentType consentType) {
        UserConsent consent = consentRepository.findByUserAndConsentTypeAndGrantedTrue(user, consentType)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No active consent of type " + consentType + " found to withdraw."));

        consent.setGranted(false);
        consent.setWithdrawnAt(LocalDateTime.now());
        consentRepository.save(consent);
        log.info("Consent {} withdrawn for user {}", consentType, user.getId());
    }

    /**
     * Checks whether a user has active consent of the given type.
     */
    public boolean hasActiveConsent(User user, ConsentType consentType) {
        return consentRepository.existsByUserAndConsentTypeAndGrantedTrue(user, consentType);
    }

    /**
     * Returns all consent records for a user.
     */
    public List<UserConsent> getUserConsents(User user) {
        return consentRepository.findByUser(user);
    }

    /**
     * Returns the immutable consent text snapshot for a given consent type.
     */
    private String getConsentText(ConsentType consentType) {
        return switch (consentType) {
            case TERMS_AND_CONDITIONS -> TERMS_CONSENT_TEXT;
            case DATA_PROCESSING -> DATA_PROCESSING_CONSENT_TEXT;
            case PUSH_NOTIFICATIONS -> PUSH_NOTIFICATION_CONSENT_TEXT;
            case MARKETING -> MARKETING_CONSENT_TEXT;
        };
    }
}
