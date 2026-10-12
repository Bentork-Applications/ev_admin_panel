package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OrderTrackingRequestDTO {

    @NotBlank(message = "Status is required")
    private String status;

    private String location;

    private String description;

    private String trackingTimestamp; // Optional: ISO-8601 string, defaults to now if null
}
