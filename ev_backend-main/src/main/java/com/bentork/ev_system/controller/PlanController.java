package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.PlanDTO;
import com.bentork.ev_system.mapper.PlanMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Plan;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.PlanRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/plans")
public class PlanController {
    private final PlanRepository planRepository;
    private final AdminRepository adminRepository;

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<?> addPlan(@RequestBody PlanDTO dto, Authentication authentication) {
        String adminEmail = authentication.getName();
        log.info("POST /api/plans/add - Creating plan, planName={}, adminEmail={}",
                dto.getPlanName(), adminEmail);

        try {
            Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
            if (admin.isEmpty()) {
                log.warn("POST /api/plans/add - Admin not found: adminEmail={}", adminEmail);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin not found");
            }

            Plan plan = PlanMapper.toEntity(dto, admin.get());
            Plan saved = planRepository.save(plan);
            log.info("POST /api/plans/add - Success, planId={}, adminEmail={}",
                    saved.getId(), adminEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body("Plan Created");
        } catch (Exception e) {
            log.error("POST /api/plans/add - Failed, adminEmail={}: {}",
                    adminEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to create plan");
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllPlans() {
        log.info("GET /api/plans/all - Request received");

        try {
            List<Plan> plans = planRepository.findAll();
            List<PlanDTO> dtos = plans.stream()
                    .map(PlanMapper::toDTO)
                    .collect(Collectors.toList());
            log.info("GET /api/plans/all - Success, returned {} plans", dtos.size());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            log.error("GET /api/plans/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch plans");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPlanById(@PathVariable Long id) {
        log.info("GET /api/plans/{} - Request received", id);

        try {
            Optional<Plan> optionalPlan = planRepository.findById(id);

            if (optionalPlan.isEmpty()) {
                log.warn("GET /api/plans/{} - Plan not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Plan not found");
            }

            PlanDTO dto = PlanMapper.toDTO(optionalPlan.get());
            log.info("GET /api/plans/{} - Success, planName={}", id, dto.getPlanName());
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            log.error("GET /api/plans/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch plan");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<?> updatePlan(@PathVariable Long id, @RequestBody PlanDTO updatedDto,
            Authentication authentication) {
        String adminEmail = authentication.getName();
        log.info("PUT /api/plans/update/{} - Updating plan, adminEmail={}", id, adminEmail);

        try {
            Optional<Plan> optionalPlan = planRepository.findById(id);
            if (optionalPlan.isEmpty()) {
                log.warn("PUT /api/plans/update/{} - Plan not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Plan not found");
            }

            Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
            if (admin.isEmpty()) {
                log.warn("PUT /api/plans/update/{} - Admin not found: adminEmail={}",
                        id, adminEmail);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin not found");
            }

            Plan updated = PlanMapper.updateEntity(optionalPlan.get(), updatedDto, admin.get());
            planRepository.save(updated);
            log.info("PUT /api/plans/update/{} - Success, adminEmail={}", id, adminEmail);
            return ResponseEntity.ok("Plan Updated");
        } catch (Exception e) {
            log.error("PUT /api/plans/update/{} - Failed, adminEmail={}: {}",
                    id, adminEmail, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update plan");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deletePlan(@PathVariable Long id) {
        log.info("DELETE /api/plans/delete/{} - Request received", id);

        try {
            Optional<Plan> optionalPlan = planRepository.findById(id);
            if (optionalPlan.isPresent()) {
                Plan plan = optionalPlan.get();
                plan.setIsActive(false);
                planRepository.save(plan);
                log.info("DELETE /api/plans/delete/{} - Soft deleted successfully", id);
                return ResponseEntity.ok("Plan Deleted");
            } else {
                log.warn("DELETE /api/plans/delete/{} - Plan not found", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Plan not found");
            }
        } catch (Exception e) {
            log.error("DELETE /api/plans/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete plan");
        }
    }
}