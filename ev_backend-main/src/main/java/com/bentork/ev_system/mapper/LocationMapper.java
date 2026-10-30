package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.LocationDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Location;

public class LocationMapper {

    // Map DTO to new Location entity
    public static Location toEntity(LocationDTO dto, Admin admin) {
        Location location = new Location();
        location.setName(dto.getName());
        location.setAddress(dto.getAddress());
        location.setLatitude(dto.getLatitude());
        location.setLongitude(dto.getLongitude());
        location.setCity(dto.getCity());
        location.setState(dto.getState());
        location.setCreatedBy(admin);
        return location;
    }

    // Update existing Location entity with values from DTO
    public static Location updateEntity(Location location, LocationDTO dto, Admin admin) {
        location.setName(dto.getName());
        location.setAddress(dto.getAddress());
        location.setLatitude(dto.getLatitude());
        location.setLongitude(dto.getLongitude());
        location.setCity(dto.getCity());
        location.setState(dto.getState());
        location.setCreatedBy(admin);
        return location;
    }
}
