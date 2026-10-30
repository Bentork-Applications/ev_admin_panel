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
public class WhatsAppCampaignResponse {

    private Long id;
    private String name;
    private String objective;
    private String description;
    private String status;         // DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED
    private String channel;        // WHATSAPP
    private String sendMode;       // MANUAL, AUTOMATIC, HYBRID
    private LocalDate startDate;
    private LocalDate endDate;
    private String timezone;
    private Long ownerAdminId;
    private String ownerAdminName;
    private String ownerAdminEmail;

    private Integer totalRounds;
    private Integer completedRounds;
    private Integer totalRecipients;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer readCount;
    private Integer respondedCount;
    private Integer failedCount;

    private String pauseReason;
    private LocalDateTime pausedAt;
    private String pausedByAdminEmail;

    private String createdByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
