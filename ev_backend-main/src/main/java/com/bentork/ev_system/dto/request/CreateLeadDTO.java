package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateLeadDTO {

    private String title;
    private String source;
    private Long companyId;
    private Long contactId;
    private String city;
    private String state;
    private Double estimatedValue;
    private String notes;
    private String nextFollowUpDate; // yyyy-MM-dd
}
