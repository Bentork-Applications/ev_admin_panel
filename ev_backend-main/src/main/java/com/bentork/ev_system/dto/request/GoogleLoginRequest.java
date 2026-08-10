package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for POST-based Google login with DPDPA consent fields.
 * Consent fields are validated in the service layer (only required for new users).
 */
public class GoogleLoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    private boolean consentToTerms;

    private boolean consentToDataProcessing;

    // Getters and Setters

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isConsentToTerms() {
        return consentToTerms;
    }

    public void setConsentToTerms(boolean consentToTerms) {
        this.consentToTerms = consentToTerms;
    }

    public boolean isConsentToDataProcessing() {
        return consentToDataProcessing;
    }

    public void setConsentToDataProcessing(boolean consentToDataProcessing) {
        this.consentToDataProcessing = consentToDataProcessing;
    }
}
