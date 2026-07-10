package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.DealerStationDTO;
import com.bentork.ev_system.model.DealerStation;

/**
 * Mapper for converting between DealerStation entity and DTO
 */
public class DealerStationMapper {

    private DealerStationMapper() {
        // Private constructor to prevent instantiation
    }

    /**
     * Convert DealerStation entity to DTO
     */
    public static DealerStationDTO toDTO(DealerStation entity) {
        if (entity == null) {
            return null;
        }

        DealerStationDTO dto = new DealerStationDTO();
        dto.setId(entity.getId());
        dto.setAssignedAt(entity.getAssignedAt());

        if (entity.getDealer() != null) {
            dto.setDealerId(entity.getDealer().getId());
            dto.setDealerName(entity.getDealer().getName());
            dto.setDealerEmail(entity.getDealer().getEmail());
        }

        if (entity.getStation() != null) {
            dto.setStationId(entity.getStation().getId());
            dto.setStationName(entity.getStation().getName());
            dto.setStationStatus(entity.getStation().getStatus());
        }

        return dto;
    }
}
