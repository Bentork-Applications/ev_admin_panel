package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class AutomationRuleResponse {
    private Long id;
    private String name;
    private String description;
    private String triggerEvent;
    private String actionType;
    private String actionPayload;
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
