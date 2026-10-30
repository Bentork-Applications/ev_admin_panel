package com.bentork.ev_system.dto.request;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWhatsAppCampaignDTO {

    private String name;
    private String objective;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String timezone;               // e.g. "Asia/Kolkata"
    private String sendMode;               // "MANUAL", "AUTOMATIC", "HYBRID"
    private Long ownerAdminId;
    private Long targetAudienceSegmentId;  // Optional segment
    private String notes;
}
