package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.ChargerDTO;

import java.util.List;

/**
 * Interface for charger CRUD and status query operations.
 */
public interface IChargerService {
    String createCharger(ChargerDTO dto);
    List<ChargerDTO> getAllChargers();
    ChargerDTO getChargerById(Long id);
    String updateCharger(Long id, ChargerDTO dto);
    String deleteCharger(Long id);
    Long getTotalChargers();
    Long getAvailableChargers();
    Long getACChargers();
    Long getDCChargers();
    ChargerDTO getChargerByOcppId(String ocppId);
    String deactivateCharger(Long id);
    String reactivateCharger(Long id);
}
