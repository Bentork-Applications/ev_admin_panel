package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateOpportunityDTO {

    private Long leadId;
    private Long companyId;
    private Long contactId;
    private String title;
    private Double value;
    private String expectedCloseDate; // yyyy-MM-dd
    private Integer probability;
    private String notes;
}
