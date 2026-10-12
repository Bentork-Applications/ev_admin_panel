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

import com.bentork.ev_system.dto.request.MaterialOutRequestDTO;
import com.bentork.ev_system.dto.response.MaterialOutResponseDTO;
import com.bentork.ev_system.service.MaterialOutService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/inventory/material-out")
@RequiredArgsConstructor
public class MaterialOutController {

    private final MaterialOutService materialOutService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<?> processMaterialOut(@Valid @RequestBody MaterialOutRequestDTO dto) {
        String adminEmail = getCurrentUserEmail();
        try {
            MaterialOutResponseDTO response = materialOutService.processMaterialOut(dto, adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCM_ADMIN', 'ADMIN')")
    public ResponseEntity<List<MaterialOutResponseDTO>> getAllMaterialOuts() {
        return ResponseEntity.ok(materialOutService.getAllMaterialOuts());
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
