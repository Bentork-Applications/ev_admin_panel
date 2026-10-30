package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.SlotBookingDTO;
import com.bentork.ev_system.model.SlotBooking;

public class SlotBookingMapper {

    public static SlotBookingDTO toDTO(SlotBooking booking) {
        SlotBookingDTO dto = new SlotBookingDTO();
        dto.setId(booking.getId());
        dto.setSlotId(booking.getSlot() != null ? booking.getSlot().getId() : null);
        dto.setUserId(booking.getUser() != null ? booking.getUser().getId() : null);
        dto.setStationId(booking.getStation() != null ? booking.getStation().getId() : null);
        dto.setChargerId(booking.getCharger() != null ? booking.getCharger().getId() : null);
        dto.setStatus(booking.getStatus());
        dto.setBookingTime(booking.getBookingTime());

        // Enrich with slot time details
        if (booking.getSlot() != null) {
            dto.setSlotStartTime(booking.getSlot().getStartTime());
            dto.setSlotEndTime(booking.getSlot().getEndTime());
        }

        // Enrich with station details
        if (booking.getStation() != null) {
            dto.setStationName(booking.getStation().getName());
        }

        // Enrich with charger details
        if (booking.getCharger() != null) {
            dto.setChargerType(booking.getCharger().getChargerType());
            dto.setConnectorType(booking.getCharger().getConnectorType());
        }

        return dto;
    }
}
