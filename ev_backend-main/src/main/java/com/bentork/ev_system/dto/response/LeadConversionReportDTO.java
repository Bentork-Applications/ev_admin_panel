package com.bentork.ev_system.dto.response;

import lombok.Data;

@Data
public class LeadConversionReportDTO {
    private long totalLeads;
    private long qualifiedLeads;
    private long convertedToOpportunity;
    private long opportunitiesWon;
    private double conversionRatePercentage;
}
