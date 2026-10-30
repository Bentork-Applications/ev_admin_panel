package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bentork.ev_system.model.Charger;

import jakarta.persistence.LockModeType;

public interface ChargerRepository extends JpaRepository<Charger, Long> {

    List<Charger> findByStationId(Long stationId);

    Optional<Charger> findByOcppId(String ocppId);

    /**
     * Acquire a PESSIMISTIC WRITE lock (SELECT ... FOR UPDATE) on the charger row.
     * This blocks any other transaction from locking the same charger until this
     * transaction commits or rolls back.
     * 
     * Used to prevent race conditions when multiple users try to start
     * a charging session on the same charger simultaneously.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Charger c WHERE c.id = :id")
    Optional<Charger> findByIdForUpdate(@Param("id") Long id);

    /**
     * Same as findByIdForUpdate but looks up by OCPP ID.
     * Used in the WebSocket/OCPP path where we identify chargers by ocppId.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Charger c WHERE c.ocppId = :ocppId")
    Optional<Charger> findByOcppIdForUpdate(@Param("ocppId") String ocppId);

    // Efficient count queries — replace findAll().stream().filter()
    long countByChargerTypeIgnoreCase(String chargerType);

    @Query("SELECT COUNT(c) FROM Charger c WHERE c.availability = true AND c.isOccupied = false")
    long countByAvailabilityTrueAndOccupiedFalse();

    // Active-aware queries for soft-delete support
    List<Charger> findByActiveTrue();

    List<Charger> findByStationIdAndActiveTrue(Long stationId);

    long countByActiveTrue();

    long countByChargerTypeIgnoreCaseAndActiveTrue(String chargerType);

    @Query("SELECT COUNT(c) FROM Charger c WHERE c.availability = true AND c.isOccupied = false AND c.active = true")
    long countByAvailabilityTrueAndOccupiedFalseAndActiveTrue();
}
