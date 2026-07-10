package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.CafeRequestDTO;
import com.bentork.ev_system.dto.response.CafeResponseDTO;
import com.bentork.ev_system.model.Cafe;

public class CafeMapper {

    public static Cafe toEntity(CafeRequestDTO dto) {
        Cafe cafe = new Cafe();
        cafe.setName(dto.getName());
        cafe.setGoogleMapLocation(dto.getGoogleMapLocation());
        cafe.setGoogleMapImageUrl(dto.getGoogleMapImageUrl());
        cafe.setRating(dto.getRating());
        cafe.setIsOpen(dto.getIsOpen());
        cafe.setLatitude(dto.getLatitude());
        cafe.setLongitude(dto.getLongitude());
        cafe.setAddress(dto.getAddress());
        cafe.setCategory(dto.getCategory());
        return cafe;
    }

    public static CafeResponseDTO toResponseDTO(Cafe cafe) {
        CafeResponseDTO dto = new CafeResponseDTO();
        dto.setId(cafe.getId());
        if (cafe.getStation() != null) {
            dto.setStationId(cafe.getStation().getId());
            dto.setStationName(cafe.getStation().getName());
        }
        dto.setAdminAdded(true);
        dto.setName(cafe.getName());
        dto.setGoogleMapsUri(cafe.getGoogleMapLocation());
        dto.setGoogleMapImageUrl(cafe.getGoogleMapImageUrl());
        dto.setRating(cafe.getRating());
        dto.setOpenNow(cafe.getIsOpen());
        dto.setLatitude(cafe.getLatitude());
        dto.setLongitude(cafe.getLongitude());
        dto.setAddress(cafe.getAddress());
        dto.setCategory(cafe.getCategory());
        return dto;
    }
}
