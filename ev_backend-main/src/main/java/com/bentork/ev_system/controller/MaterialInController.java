package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.MaterialInRequestDTO;
import com.bentork.ev_system.dto.response.MaterialInResponseDTO;
import com.bentork.ev_system.service.MaterialInService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/inventory/material-in")
@RequiredArgsConstructor
public class MaterialInController {

    private final MaterialInService materialInService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<?> processMaterialIn(@Valid @RequestBody MaterialInRequestDTO dto) {
        String adminEmail = getCurrentUserEmail();
        try {
            MaterialInResponseDTO response = materialInService.processMaterialIn(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<List<MaterialInResponseDTO>> getAllMaterialIns() {
        return ResponseEntity.ok(materialInService.getAllMaterialIns());
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
