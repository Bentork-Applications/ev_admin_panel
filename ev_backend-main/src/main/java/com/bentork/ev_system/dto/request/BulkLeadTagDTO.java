package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class BulkLeadTagDTO {

    @NotEmpty(message = "At least one lead ID is required")
    private List<Long> leadIds;

    @NotEmpty(message = "At least one tag is required")
    private List<String> tags;
}
