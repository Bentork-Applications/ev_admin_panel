package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * Request payload when completing an activity with notes and optional outcome.
 */
@Getter
@Setter
public class CompleteActivityDTO {

    private String notes;   // Outcome/resolution notes
    private String outcome; // Optional updated call outcome (e.g., "interested", "meeting_scheduled")
}
