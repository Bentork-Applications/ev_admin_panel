package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LeadResponse {

    private Long id;
    private String leadNumber;
    private String title;
    private String source;
    private String status;
    private Long companyId;
    private String companyName;
    private Long contactId;
    private String contactName;
    private String contactPhone;
    private Long ownerAdminId;
    private String ownerAdminName;
    private String city;
    private String state;
    private Double estimatedValue;
    private String notes;
    private LocalDate nextFollowUpDate;
    private String indiaMartLeadId;
    private Long convertedToOpportunityId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
