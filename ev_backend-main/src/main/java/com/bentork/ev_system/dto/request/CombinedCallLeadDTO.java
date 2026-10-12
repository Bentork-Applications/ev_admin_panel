package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO for the BRD's "Search-first New Call" workflow.
 * 
 * The frontend searches by phone first. If no match is found,
 * this DTO captures all the info to create a Contact + Company + Lead + Call Activity
 * in a single transaction.
 */
@Getter
@Setter
public class CombinedCallLeadDTO {

    // Contact info
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String contactDesignation;

    // Company info (optional — may be unknown on first call)
    private String companyName;
    private String industry;
    private String companyType;
    private String city;
    private String state;

    // Lead info
    private String leadTitle;
    private String source; // defaults to "phone_call"
    private Double estimatedValue;

    // Call activity info
    private String callOutcome;
    private String callNotes;
    private Integer callDurationMinutes;
    private String followUpDate; // yyyy-MM-dd
}
