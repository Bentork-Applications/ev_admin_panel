package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActivityResponse {

    private Long id;
    private Long leadId;
    private String leadTitle;
    private String leadNumber;
    private Long companyId;
    private String companyName;
    private Long contactId;
    private String contactName;
    private String contactPhone;
    private Long opportunityId;
    private String opportunityTitle;
    private String activityType;
    private String callOutcome;
    private String subject;
    private String notes;
    private Integer durationMinutes;
    private LocalDate followUpDate;
    private LocalTime followUpTime;
    private Long performedByAdminId;
    private String performedByAdminName;
    private LocalDateTime activityDate;
    private String status;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private Boolean isOverdue;
}
