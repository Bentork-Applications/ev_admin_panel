package com.bentork.ev_system.dto.request;

import java.time.LocalDate;

import lombok.Data;

@Data
public class CreateCampaignDTO {
    private String name;
    private String type; // e.g., "POST", "OFFER", "NEWSLETTER"
    private String description;
    private LocalDate scheduledDate;
}
