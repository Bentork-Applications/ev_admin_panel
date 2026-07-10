package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.UserPlanSelectionDTO;
import com.bentork.ev_system.service.UserPlanSelectionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.bentork.ev_system.dto.request.PlanDTO;

@RestController
@RequestMapping("/api/user-plan-selection")
public class UserPlanSelectionController {

    private final UserPlanSelectionService userPlanSelectionService;

    public UserPlanSelectionController(UserPlanSelectionService userPlanSelectionService) {
        this.userPlanSelectionService = userPlanSelectionService;
    }

    @PostMapping("/select")
    public ResponseEntity<UserPlanSelectionDTO> selectPlan(@RequestBody UserPlanSelectionDTO request) {
        Long userId = request.getUserId();
        Long planId = request.getPlanId();
        return ResponseEntity.ok(userPlanSelectionService.selectPlan(userId, planId));
    }

    @GetMapping("/active/{userId}")
    public ResponseEntity<UserPlanSelectionDTO> getActivePlan(@PathVariable Long userId) {
        return ResponseEntity.ok(userPlanSelectionService.getActivePlan(userId));
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<UserPlanSelectionDTO>> getPlanHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(userPlanSelectionService.getUserPlanHistory(userId));
    }

    // Get all available plans for users
    @GetMapping("/available")
    public ResponseEntity<?> getAvailablePlans() {
        try {
            List<PlanDTO> planDTOs = userPlanSelectionService.getAvailablePlans();
            return ResponseEntity.ok(planDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to fetch plans");
        }
    }

    // Get plan details by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlanById(@PathVariable Long id) {
        try{
        PlanDTO planDTO = userPlanSelectionService.getPlanById(id);
        return ResponseEntity.ok(planDTO);
        } catch(Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to fetch plans");
        }
    }
}
