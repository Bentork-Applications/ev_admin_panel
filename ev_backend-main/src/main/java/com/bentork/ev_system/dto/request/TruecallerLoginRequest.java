package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TruecallerLoginRequest {

    @NotBlank(message = "Authorization code is required")
    private String authorizationCode;

    @NotBlank(message = "Code verifier is required")
    private String codeVerifier;

    private String clientType; // "MOBILE" or "WEB"
}
