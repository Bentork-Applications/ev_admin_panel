package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, Long> {

    Optional<EmergencyContact> findByStationId(Long stationId);

    boolean existsByStationId(Long stationId);
}