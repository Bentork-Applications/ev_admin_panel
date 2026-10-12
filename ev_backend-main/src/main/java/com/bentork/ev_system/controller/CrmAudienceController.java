package com.bentork.ev_system.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
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
}
