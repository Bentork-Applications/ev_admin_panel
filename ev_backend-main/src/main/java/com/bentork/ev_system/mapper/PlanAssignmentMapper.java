package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.PlanAssignmentDTO;
import com.bentork.ev_system.model.PlanAssignment;

public class PlanAssignmentMapper {

	public static PlanAssignmentDTO toDTO(PlanAssignment entity) {
		PlanAssignmentDTO dto = new PlanAssignmentDTO();
		dto.setId(entity.getId());
		dto.setIsActive(entity.getIsActive());
		dto.setAssignedAt(entity.getAssignedAt());

		// Plan info
		if (entity.getPlan() != null) {
			dto.setPlanId(entity.getPlan().getId());
			dto.setPlanName(entity.getPlan().getPlanName());
		}

		// Station info
		if (entity.getStation() != null) {
			dto.setStationId(entity.getStation().getId());
			dto.setStationName(entity.getStation().getName());
		}

		// Charger info
		if (entity.getCharger() != null) {
			dto.setChargerId(entity.getCharger().getId());
			dto.setChargerOcppId(entity.getCharger().getOcppId());
		}

		// Admin info
		if (entity.getAssignedBy() != null) {
			dto.setAssignedBy(entity.getAssignedBy().getId());
		}

		return dto;
	}
}
