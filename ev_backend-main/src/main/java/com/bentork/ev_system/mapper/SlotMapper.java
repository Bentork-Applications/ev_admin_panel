package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.SlotDTO;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Slot;

public class SlotMapper {

    public static SlotDTO toDTO(Slot slot) {
        SlotDTO dto = new SlotDTO();
        dto.setId(slot.getId());
        dto.setChargerId(slot.getCharger() != null ? slot.getCharger().getId() : null);
        dto.setBooked(slot.isBooked());
        dto.setAllDay(slot.isAllDay());
        dto.setCreatedAt(slot.getCreatedAt());

        if (slot.isAllDay()) {
            // For all-day slots: return only time fields, no date
            dto.setStartTimeOnly(slot.getStartTimeOnly());
            dto.setEndTimeOnly(slot.getEndTimeOnly());
            dto.setStartTime(null);
            dto.setEndTime(null);
        } else {
            // For date-specific slots: return full datetime
            dto.setStartTime(slot.getStartTime());
            dto.setEndTime(slot.getEndTime());
        }

        return dto;
    }

    public static Slot toEntity(SlotDTO dto, Charger charger) {
        Slot slot = new Slot();
        slot.setCharger(charger);
        slot.setStartTime(dto.getStartTime());
        slot.setEndTime(dto.getEndTime());
        slot.setBooked(dto.isBooked());
        slot.setAllDay(dto.isAllDay());
        return slot;
    }
}
