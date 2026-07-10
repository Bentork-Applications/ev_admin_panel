package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.UserPlanSelectionDTO;
import com.bentork.ev_system.model.UserPlanSelection;

public class UserPlanSelectionMapper {

    public static UserPlanSelectionDTO toDTO(UserPlanSelection entity) {
        UserPlanSelectionDTO dto = new UserPlanSelectionDTO();
        dto.setId(entity.getId());
        dto.setUserId(entity.getUserId());
        dto.setPlanId(entity.getPlanId());
        dto.setSelectedAt(entity.getSelectedAt());
        dto.setExpiresAt(entity.getExpiresAt());
        dto.setIsActive(entity.getIsActive());
        return dto;
    }

    public static UserPlanSelection toEntity(UserPlanSelectionDTO dto) {
        UserPlanSelection entity = new UserPlanSelection();
        entity.setId(dto.getId());
        entity.setUserId(dto.getUserId());
        entity.setPlanId(dto.getPlanId());
        entity.setSelectedAt(dto.getSelectedAt());
        entity.setExpiresAt(dto.getExpiresAt());
        entity.setIsActive(dto.getIsActive());
        return entity;
    }
}