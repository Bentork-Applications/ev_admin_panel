package com.bentork.ev_system.dto.request;

import lombok.Data;

@Data
public class UpdateRequirementDTO {
    private String productCategory;
    private String voltage;
    private String capacity;
    private String chemistry;
    private Integer quantity;
    private String timeline;
    private Double budget;
    private String notes;
}
