package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;

public class ApplyReferralRequest {

    @NotBlank(message = "Referral code is required")
    private String referralCode;

    public String getReferralCode() {
        return referralCode;
    }

    public void setReferralCode(String referralCode) {
        this.referralCode = referralCode;
    }
}
