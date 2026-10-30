package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.PlanDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Plan;

public class PlanMapper {

    // For creating new plan
    public static Plan toEntity(PlanDTO dto, Admin admin) {
        Plan plan = new Plan();
        plan.setId(dto.getId());
        plan.setPlanName(dto.getPlanName());
        plan.setDescription(dto.getDescription());
        plan.setDurationMin(dto.getDurationMin());
        plan.setWalletDeduction(dto.getWalletDeduction());
        plan.setChargerType(dto.getChargerType());
        plan.setRate(dto.getRate());
        plan.setCreatedBy(admin);
        return plan;
    }

    // Optional (unused if you're always setting admin): For internal conversion
    public static Plan toEntity(PlanDTO dto) {
        Plan plan = new Plan();
        plan.setId(dto.getId());
        plan.setPlanName(dto.getPlanName());
        plan.setDescription(dto.getDescription());
        plan.setDurationMin(dto.getDurationMin());
        plan.setWalletDeduction(dto.getWalletDeduction());
        plan.setChargerType(dto.getChargerType());
        plan.setRate(dto.getRate());
        return plan;
    }

    // For updating existing plan
    public static Plan updateEntity(Plan existing, PlanDTO dto, Admin admin) {
        existing.setPlanName(dto.getPlanName());
        existing.setDescription(dto.getDescription());
        existing.setDurationMin(dto.getDurationMin());
        existing.setWalletDeduction(dto.getWalletDeduction());
        existing.setChargerType(dto.getChargerType());
        existing.setRate(dto.getRate());
        existing.setCreatedBy(admin); // Optional: only if updated by a new admin
        return existing;
    }

    // Convert to DTO
    public static PlanDTO toDTO(Plan plan) {
        PlanDTO dto = new PlanDTO();
        dto.setId(plan.getId());
        dto.setPlanName(plan.getPlanName());
        dto.setDescription(plan.getDescription());
        dto.setDurationMin(plan.getDurationMin());
        dto.setWalletDeduction(plan.getWalletDeduction());
        dto.setChargerType(plan.getChargerType());
        dto.setRate(plan.getRate());
        dto.setIsActive(plan.getIsActive());

        if (plan.getCreatedBy() != null) {
            dto.setCreatedBy(plan.getCreatedBy().getId());
        }

        return dto;
    }
}
