package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActivityResponse {

    private Long id;
    private Long leadId;
    private Long companyId;
    private Long contactId;
    private Long opportunityId;
    private String activityType;
    private String callOutcome;
    private String subject;
    private String notes;
    private Integer durationMinutes;
    private LocalDate followUpDate;
    private Long performedByAdminId;
    private String performedByAdminName;
    private LocalDateTime activityDate;
    private LocalDateTime createdAt;
}
