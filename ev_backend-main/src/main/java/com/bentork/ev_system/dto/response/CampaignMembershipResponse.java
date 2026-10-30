package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignMembershipResponse {

    private Long id;
    private Long campaignId;
    private String campaignName;
    private Long leadId;
    private String leadNumber;
    private String contactName;
    private String phone;
    private String companyName;
    private String leadStatus;
    private Long ownerAdminId;
    private String ownerAdminName;

    private String eligibilityStatus; // ELIGIBLE, PAUSED, OPTED_OUT, CONVERTED, DISQUALIFIED, SUPPRESSED
    private Integer currentRound;
    private LocalDate nextDueDate;

    private String pauseReason;
    private LocalDateTime pausedAt;
    private String pausedByAdminEmail;

    private boolean hasReplied;
    private LocalDateTime repliedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
