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
public class UpdateWhatsAppCampaignDTO {

    private String name;
    private String objective;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String timezone;
    private String sendMode;
    private Long ownerAdminId;
}
