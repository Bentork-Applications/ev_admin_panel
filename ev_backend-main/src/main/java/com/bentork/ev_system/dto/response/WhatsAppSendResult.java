package com.bentork.ev_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppSendResult {

    private boolean success;
    private String providerMessageId; // WAMID from Meta Cloud API
    private String status;            // "SUBMITTED", "SENT", "FAILED"
    private String errorCode;
    private String errorMessage;
}
