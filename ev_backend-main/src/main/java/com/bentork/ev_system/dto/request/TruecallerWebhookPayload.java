package com.bentork.ev_system.dto.request;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class TruecallerWebhookPayload {
    @JsonProperty("requestId")
    private String requestId;
    
    private String accessToken;
    private String endpoint; // Some truecaller webhooks send this
    private String payload; // Raw base64 payload in some SDKs
    private String signature; // Request signature for verification
    
    // For simpler setups, sometimes it directly sends profile data
    private String phoneNumber;
    private String firstName;
    private String lastName;

    @JsonProperty("status")
    private String status;

    @JsonProperty("phonenumber")
    private String phonenumber;

    public String getPhonenumber() {
        return phonenumber;
    }

    public void setPhonenumber(String phonenumber) {
        this.phonenumber = phonenumber;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
}
