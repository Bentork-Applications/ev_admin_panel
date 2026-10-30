package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class CampaignDispatchResultDTO {
    private Long campaignId;
    private String campaignName;
    private String channel;
    private int totalRecipients;
    private int emailsSent;
    private int whatsAppSent;
    private int failedCount;
    private String status;
    private LocalDateTime dispatchedAt;
    private List<String> errors = new ArrayList<>();
}
