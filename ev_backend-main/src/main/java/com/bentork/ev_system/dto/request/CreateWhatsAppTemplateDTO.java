package com.bentork.ev_system.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWhatsAppTemplateDTO {

    private String name;
    private String category;       // MARKETING, UTILITY
    private String language;       // en, hi, etc.
    private String body;
    private String headerType;     // TEXT, IMAGE, VIDEO, DOCUMENT
    private String headerContent;
    private String footerText;
}
