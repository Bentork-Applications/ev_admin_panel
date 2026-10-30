package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class AudienceSegmentSavedResponse {

    private Long id;
    private String name;
    private String description;
    private String filtersJson;
    private int matchedCount;
    private String createdByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
