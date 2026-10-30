package com.bentork.ev_system.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWhatsAppTemplateDTO {

    private String category;
    private String language;
    private String body;
    private String headerType;
    private String headerContent;
    private String footerText;
    private String approvalStatus; // APPROVED, PENDING, REJECTED
    private Boolean active;
}
