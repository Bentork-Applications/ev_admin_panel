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
public class CampaignMessageResponse {

    private Long id;
    private Long membershipId;
    private Long roundId;
    private Integer roundNumber;
    private Long leadId;
    private String leadNumber;
    private String contactName;
    private String phone;

    private String providerMessageId;
    private String templateUsed;
    private String status;           // QUEUED, SUBMITTED, SENT, DELIVERED, READ, FAILED, SKIPPED, UNDELIVERABLE
    private String errorCode;
    private String errorMessage;
    private String skipReason;

    private LocalDateTime queuedAt;
    private LocalDateTime submittedAt;
    private LocalDateTime sentAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime readAt;
    private LocalDateTime failedAt;

    private Integer retryCount;
    private String triggeredBy;
    private LocalDateTime createdAt;
}
