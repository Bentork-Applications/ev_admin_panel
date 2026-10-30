package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SaveAudienceSegmentDTO {

    @NotBlank(message = "Segment name is required")
    private String name;

    private String description;

    // Embedded filter criteria — stored as JSON for flexibility
    private AudienceFilterDTO filters;
}
