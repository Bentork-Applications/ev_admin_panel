package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class RequirementResponse {
    private Long id;
    private Long leadId;
    private String leadTitle;
    private Long companyId;
    private String companyName;
    private String productCategory;
    private String voltage;
    private String capacity;
    private String chemistry;
    private Integer quantity;
    private String timeline;
    private Double budget;
    private String notes;
    private LocalDateTime createdAt;
}
