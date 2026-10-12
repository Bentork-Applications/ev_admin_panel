package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Session data to avoid Hibernate proxy serialization issues
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDTO {
    private Long id;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Double energyKwh;
    private Double cost;
    private String status;
    private String sourceType;
    private Long chargingDurationSeconds;
    private LocalDateTime createdAt;

    // Related entity IDs only
    private Long userId;
    private Long chargerId;
    private Long stationId;

    // Optional names for display
    private String userName;
    private String chargerName;
    private String stationName;
}
