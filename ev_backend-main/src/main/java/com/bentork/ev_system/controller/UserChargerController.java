package com.bentork.ev_system.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.ChargerDTO;
import com.bentork.ev_system.service.interfaces.IChargerService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user/charger")
public class UserChargerController {
    private final IChargerService chargerService;
    
    // get charger by ocppid
    @GetMapping("/ocpp/{ocppId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getChargerByOcppId(@PathVariable String ocppId) {
        try {
            ChargerDTO charger = chargerService.getChargerByOcppId(ocppId);
            return ResponseEntity.ok(charger);
        } catch (Exception e) {
            return ResponseEntity.status(404).body("Charger not found");
        }
    }

}
