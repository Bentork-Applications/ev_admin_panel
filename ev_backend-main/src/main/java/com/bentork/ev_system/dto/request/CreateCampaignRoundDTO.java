package com.bentork.ev_system.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCampaignRoundDTO {

    private Integer roundNumber;
    private String templateName;
    private String templateBody;
    private Long templateId;
    private LocalDate plannedDate;
    private LocalTime plannedTime;
    private String timezone;
    private String sendMode;       // "MANUAL" or "AUTOMATIC"
}
