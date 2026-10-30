package com.bentork.ev_system.dto.response;

import lombok.Data;

@Data
public class SalesPerformanceDTO {
    private Long adminId;
    private String adminName;
    private long totalLeadsHandled;
    private long opportunitiesWon;
    private double totalRevenueGenerated;
}
