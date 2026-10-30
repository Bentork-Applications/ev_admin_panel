package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.AudienceFilterDTO;
import com.bentork.ev_system.dto.response.AudienceSegmentResponse;
import com.bentork.ev_system.service.AudienceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/crm/audience")
@RequiredArgsConstructor
public class CrmAudienceController {

    private final AudienceService audienceService;

    @PostMapping("/build")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<AudienceSegmentResponse> buildAudience(@RequestBody AudienceFilterDTO filter) {
        return ResponseEntity.ok(audienceService.buildAudience(filter));
    }

    @PostMapping("/segments")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> saveSegment(@RequestBody com.bentork.ev_system.dto.request.SaveAudienceSegmentDTO dto) {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            return ResponseEntity.ok(audienceService.saveSegment(dto, auth.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/segments")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getAllSegments() {
        return ResponseEntity.ok(audienceService.getAllSegments());
    }

    @GetMapping("/segments/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getSegmentById(@org.springframework.web.bind.annotation.PathVariable Long id) {
        try {
            return ResponseEntity.ok(audienceService.getSegmentById(id));
        } catch (IllegalArgumentException e) {
            return org.springframework.http.ResponseEntity.notFound().build();
        }
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/segments/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteSegment(@org.springframework.web.bind.annotation.PathVariable Long id) {
        try {
            audienceService.deleteSegment(id);
            return ResponseEntity.ok("Segment deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
