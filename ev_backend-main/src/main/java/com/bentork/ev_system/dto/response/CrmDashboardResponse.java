package com.bentork.ev_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CrmDashboardResponse {

    // Lead KPIs
    private long totalLeadsThisMonth;
    private long newLeads;
    private long contactedLeads;
    private long qualifiedLeads;
    private long convertedLeads;
    private long lostLeads;

    // Activity KPIs
    private long callsMadeToday;
    private long meetingsToday;
    private long overdueFollowUps;

    // Pipeline KPIs
    private long activeOpportunities;
    private Double totalPipelineValue;
    private Double weightedPipelineValue;
    private long wonDealsThisMonth;
    private Double wonValueThisMonth;
}
