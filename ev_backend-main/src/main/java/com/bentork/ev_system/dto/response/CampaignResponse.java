package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class CampaignResponse {
    private Long id;
    private String name;
    private String type;
    private String channel;
    private String subject;
    private String messageBody;
    private Long targetAudienceSegmentId;
    private String description;
    private LocalDate scheduledDate;
    private String status;
    private Integer totalRecipients;
    private Integer sentCount;
    private Integer openedCount;
    private Integer respondedCount;
    private String createdByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
