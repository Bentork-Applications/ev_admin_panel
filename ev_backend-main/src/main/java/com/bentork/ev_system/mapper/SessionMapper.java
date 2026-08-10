package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.SessionDTO;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.model.User;

public class SessionMapper {

    public static SessionDTO toDTO(Session session) {
        SessionDTO dto = new SessionDTO();
        dto.setSessionId(session.getId());
        dto.setUserId(session.getUser() != null ? session.getUser().getId() : null);
        dto.setChargerId(session.getCharger() != null ? session.getCharger().getId() : null);
        dto.setBoxId(session.getBoxId());
        dto.setEnergyUsed(session.getEnergyKwh());
        dto.setCost(session.getCost());
        dto.setStatus(session.getStatus());
        return dto;
    }

    public static Session toEntity(SessionDTO dto, User user, Charger charger) {
        Session session = new Session();
        session.setUser(user);
        session.setCharger(charger);
        session.setBoxId(dto.getBoxId());
        session.setEnergyKwh(dto.getEnergyUsed());
        session.setCost(dto.getCost());
        session.setStatus(dto.getStatus());
        return session;
    }
}
