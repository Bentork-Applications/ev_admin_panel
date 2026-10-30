package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BulkLeadAssignDTO {

    @NotEmpty(message = "At least one lead ID is required")
    private List<Long> leadIds;

    @NotNull(message = "Target owner admin ID is required")
    private Long targetOwnerAdminId;
}
