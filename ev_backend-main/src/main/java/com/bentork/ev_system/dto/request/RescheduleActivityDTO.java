package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Request payload to reschedule an existing activity/follow-up.
 */
@Getter
@Setter
public class RescheduleActivityDTO {

    private String newFollowUpDate; // yyyy-MM-dd (required)
    private String newFollowUpTime; // HH:mm or HH:mm:ss (optional)
    private String reason;          // Note or reason for rescheduling
}
