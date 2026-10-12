package com.bentork.ev_system.dto.request;

import lombok.Data;

@Data
public class UpdateCampaignStatusDTO {
    private String status; // "SCHEDULED", "SENT", "COMPLETED"
}
