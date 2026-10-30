package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppTemplateResponse {

    private Long id;
    private String name;
    private String category;
    private String language;
    private String body;
    private String headerType;
    private String headerContent;
    private String footerText;
    private String providerTemplateId;
    private String approvalStatus; // APPROVED, PENDING, REJECTED
    private boolean active;
    private String createdByAdminEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
