package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.UpdateCrmSettingDTO;
import com.bentork.ev_system.dto.response.CrmSettingResponse;
import com.bentork.ev_system.service.CrmSettingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/crm/settings")
@RequiredArgsConstructor
public class CrmSettingsController {

    private final CrmSettingService crmSettingService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<CrmSettingResponse>> getAllSettings() {
        return ResponseEntity.ok(crmSettingService.getAllSettings());
    }

    @GetMapping("/{key}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getSettingByKey(@PathVariable String key) {
        try {
            return ResponseEntity.ok(crmSettingService.getSettingByKey(key));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<CrmSettingResponse> updateSetting(
            @PathVariable String key,
            @RequestBody UpdateCrmSettingDTO dto) {
        return ResponseEntity.ok(crmSettingService.updateSetting(key, dto));
    }

    @DeleteMapping("/{key}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deleteSetting(@PathVariable String key) {
        try {
            crmSettingService.deleteSetting(key);
            return ResponseEntity.ok("Setting deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
