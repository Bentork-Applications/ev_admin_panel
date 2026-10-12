package com.bentork.ev_system.dto.request;

import java.util.List;

import lombok.Data;

@Data
public class AudienceFilterDTO {
    // Lead filters
    private String leadStatus;
    private String leadSource;
    
    // Company filters
    private String companyIndustry;
    private String companyType;
    private String city;
    private String state;
    
    // Activity filters
    private Boolean hasOpenOpportunities;
}
