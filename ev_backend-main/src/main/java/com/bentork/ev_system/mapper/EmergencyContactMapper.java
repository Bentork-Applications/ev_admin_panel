package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.EmergencyContactDTO;
import com.bentork.ev_system.model.EmergencyContact;
import com.bentork.ev_system.model.Station;

public class EmergencyContactMapper {

    public static EmergencyContact toEntity(EmergencyContactDTO dto, Station station) {
        EmergencyContact contact = new EmergencyContact();
        contact.setId(dto.getId());
        contact.setCpoPhoneNumber(dto.getCpoPhoneNumber());
        contact.setCompanySupportNumber(dto.getCompanySupportNumber());
        contact.setStation(station);
        return contact;
    }

    public static EmergencyContactDTO toDTO(EmergencyContact contact) {
        EmergencyContactDTO dto = new EmergencyContactDTO();
        dto.setId(contact.getId());
        dto.setCpoPhoneNumber(contact.getCpoPhoneNumber());
        dto.setCompanySupportNumber(contact.getCompanySupportNumber());
        dto.setStationId(contact.getStation().getId());
        dto.setStationName(contact.getStation().getName());
        return dto;
    }
}
