package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignRoundResponse {

    private Long id;
    private Long campaignId;
    private String campaignName;
    private Integer roundNumber;
    private String templateName;
    private String templateBody;
    private Long templateId;
    private String templateStatus;
    private LocalDate plannedDate;
    private LocalTime plannedTime;
    private String timezone;
    private String sendMode;
    private String status;

    private Integer eligibleCount;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer readCount;
    private Integer failedCount;
    private Integer skippedCount;

    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String triggeredByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
