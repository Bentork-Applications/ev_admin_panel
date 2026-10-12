package com.bentork.ev_system.dto.request;

import com.bentork.ev_system.model.enums.ConsentType;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for withdrawing or granting a specific consent type.
 */
public class ConsentWithdrawRequest {

    @NotNull(message = "Consent type is required")
    private ConsentType consentType;

    // Getters and Setters

    public ConsentType getConsentType() {
        return consentType;
    }

    public void setConsentType(ConsentType consentType) {
        this.consentType = consentType;
    }
}
