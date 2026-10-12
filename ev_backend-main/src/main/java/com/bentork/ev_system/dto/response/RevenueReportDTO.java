package com.bentork.ev_system.dto.response;

import lombok.Data;

@Data
public class RevenueReportDTO {
    private String period; // e.g., "September 2026", "Q3 2026"
    private double expectedRevenue; // from open opportunities
    private double closedRevenue; // from won opportunities
}
