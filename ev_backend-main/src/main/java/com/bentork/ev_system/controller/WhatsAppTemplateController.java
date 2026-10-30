package com.bentork.ev_system.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateWhatsAppTemplateDTO;
import com.bentork.ev_system.dto.request.UpdateWhatsAppTemplateDTO;
import com.bentork.ev_system.dto.response.WhatsAppTemplateResponse;
import com.bentork.ev_system.model.WhatsAppTemplate;
import com.bentork.ev_system.repository.WhatsAppTemplateRepository;

import lombok.RequiredArgsConstructor;

/**
 * Controller for managing approved WhatsApp templates (FR-09).
 */
@RestController
@RequestMapping("/api/crm/whatsapp-templates")
@RequiredArgsConstructor
public class WhatsAppTemplateController {

    private final WhatsAppTemplateRepository templateRepository;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createTemplate(@RequestBody CreateWhatsAppTemplateDTO dto) {
        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Template name is required");
        }
        if (dto.getBody() == null || dto.getBody().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Template body is required");
        }
        if (templateRepository.existsByName(dto.getName().trim())) {
            return ResponseEntity.badRequest().body("Template with name '" + dto.getName() + "' already exists");
        }

        WhatsAppTemplate template = new WhatsAppTemplate();
        template.setName(dto.getName().trim());
        template.setCategory(dto.getCategory() != null ? dto.getCategory().toUpperCase().trim() : "MARKETING");
        template.setLanguage(dto.getLanguage() != null ? dto.getLanguage().trim() : "en");
        template.setBody(dto.getBody());
        template.setHeaderType(dto.getHeaderType());
        template.setHeaderContent(dto.getHeaderContent());
        template.setFooterText(dto.getFooterText());
        template.setApprovalStatus("APPROVED"); // Default to approved for internal management
        template.setCreatedByAdminEmail(getCurrentUserEmail());

        WhatsAppTemplate saved = templateRepository.save(template);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<WhatsAppTemplateResponse>> getTemplates(
            @RequestParam(required = false) String status) {
        List<WhatsAppTemplate> templates;
        if (status != null && !status.trim().isEmpty()) {
            templates = templateRepository.findByApprovalStatusAndActiveTrueOrderByCreatedAtDesc(status.toUpperCase().trim());
        } else {
            templates = templateRepository.findByActiveTrueOrderByCreatedAtDesc();
        }

        return ResponseEntity.ok(templates.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getTemplateById(@PathVariable Long id) {
        return templateRepository.findById(id)
                .map(t -> ResponseEntity.ok(mapToResponse(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateTemplate(
            @PathVariable Long id,
            @RequestBody UpdateWhatsAppTemplateDTO dto) {
        WhatsAppTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) {
            return ResponseEntity.notFound().build();
        }

        if (dto.getCategory() != null) template.setCategory(dto.getCategory().toUpperCase().trim());
        if (dto.getLanguage() != null) template.setLanguage(dto.getLanguage().trim());
        if (dto.getBody() != null) template.setBody(dto.getBody());
        if (dto.getHeaderType() != null) template.setHeaderType(dto.getHeaderType());
        if (dto.getHeaderContent() != null) template.setHeaderContent(dto.getHeaderContent());
        if (dto.getFooterText() != null) template.setFooterText(dto.getFooterText());
        if (dto.getApprovalStatus() != null) template.setApprovalStatus(dto.getApprovalStatus().toUpperCase().trim());
        if (dto.getActive() != null) template.setActive(dto.getActive());

        WhatsAppTemplate updated = templateRepository.save(template);
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deactivateTemplate(@PathVariable Long id) {
        WhatsAppTemplate template = templateRepository.findById(id).orElse(null);
        if (template == null) {
            return ResponseEntity.notFound().build();
        }

        template.setActive(false);
        templateRepository.save(template);
        return ResponseEntity.ok("Template deactivated successfully");
    }

    private WhatsAppTemplateResponse mapToResponse(WhatsAppTemplate t) {
        return WhatsAppTemplateResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .category(t.getCategory())
                .language(t.getLanguage())
                .body(t.getBody())
                .headerType(t.getHeaderType())
                .headerContent(t.getHeaderContent())
                .footerText(t.getFooterText())
                .providerTemplateId(t.getProviderTemplateId())
                .approvalStatus(t.getApprovalStatus())
                .active(t.isActive())
                .createdByAdminEmail(t.getCreatedByAdminEmail())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }
}
