package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateAutomationRuleDTO {
    
    @NotBlank(message = "Name is required")
    private String name;
    
    private String description;
    
    @NotBlank(message = "Trigger event is required")
    private String triggerEvent;
    
    @NotBlank(message = "Action type is required")
    private String actionType;
    
    private String actionPayload;
    
    private boolean isActive = true;
}
