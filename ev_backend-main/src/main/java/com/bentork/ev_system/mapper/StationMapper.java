package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.model.Station;

public class StationMapper {

    public static StationDTO toDTO(Station station) {
        StationDTO dto = new StationDTO();
        dto.setId(station.getId());
        dto.setLocationId(station.getLocation().getId());
        dto.setLocationName(station.getLocation().getName());
        dto.setName(station.getName());
        dto.setStatus(station.getStatus());
        dto.setDirectionLink(station.getDirectionLink());
        dto.setCreatedAt(station.getCreatedAt());
        dto.setActive(station.getActive());
        return dto;
    }

    public static Station toEntity(StationDTO dto) {
        Station station = new Station();
        station.setName(dto.getName());
        station.setStatus(dto.getStatus());
        station.setDirectionLink(dto.getDirectionLink());
        return station;
    }
}

