package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LogActivityDTO {

    private Long leadId;
    private Long companyId;
    private Long contactId;
    private Long opportunityId;

    private String activityType; // "call", "meeting", "email", "follow_up", "note"
    private String callOutcome;  // Only for activityType = "call"
    private String subject;
    private String notes;
    private Integer durationMinutes;
    private String followUpDate; // yyyy-MM-dd
    private String activityDate; // yyyy-MM-dd'T'HH:mm:ss (optional, defaults to now)
}
