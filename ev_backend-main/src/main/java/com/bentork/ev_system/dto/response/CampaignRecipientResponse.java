package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class CampaignRecipientResponse {
    private Long id;
    private Long campaignId;
    private Long companyId;
    private String companyName;
    private Long contactId;
    private String contactName;
    private String recipientEmail;
    private String recipientPhone;
    private String channelUsed;
    private String deliveryStatus;
    private boolean sent;
    private String errorMessage;
    private LocalDateTime sentAt;
    private boolean opened;
    private boolean responded;
    private LocalDateTime createdAt;
}
