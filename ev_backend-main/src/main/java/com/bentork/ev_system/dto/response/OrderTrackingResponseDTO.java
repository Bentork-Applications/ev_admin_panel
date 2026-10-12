package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class OrderTrackingResponseDTO {
    private Long id;
    private String status;
    private String location;
    private String description;
    private LocalDateTime trackingTimestamp;
    private String createdByAdminEmail;
}
