package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignAuditLogResponse {

    private Long id;
    private Long campaignId;
    private Long roundId;
    private Long membershipId;
    private Long leadId;
    private String action;
    private String details;
    private String performedBy;
    private LocalDateTime timestamp;
}
