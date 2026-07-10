package com.bentork.ev_system.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bentork.ev_system.model.Slot;

public interface SlotRepository extends JpaRepository<Slot, Long> {

        // Find all slots for a charger
        List<Slot> findByChargerId(Long chargerId);

        // Find available (unbooked) slots for a charger
        List<Slot> findByChargerIdAndBookedFalse(Long chargerId);

        // Find available slots for a charger that are in the future
        List<Slot> findByChargerIdAndBookedFalseAndStartTimeAfter(Long chargerId, LocalDateTime after);

        // Find slots within a time range for a charger (for overlap detection)
        @Query("SELECT s FROM Slot s WHERE s.charger.id = :chargerId " +
                        "AND s.startTime < :endTime AND s.endTime > :startTime")
        List<Slot> findOverlappingSlots(@Param("chargerId") Long chargerId,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime);

        // Find all slots for a charger on a specific date
        @Query("SELECT s FROM Slot s WHERE s.charger.id = :chargerId " +
                        "AND s.startTime >= :dayStart AND s.startTime < :dayEnd " +
                        "ORDER BY s.startTime ASC")
        List<Slot> findByChargerIdAndDate(@Param("chargerId") Long chargerId,
                        @Param("dayStart") LocalDateTime dayStart,
                        @Param("dayEnd") LocalDateTime dayEnd);

        // Find all-day (recurring everyday) slots for a charger
        List<Slot> findByChargerIdAndAllDayTrue(Long chargerId);

        // Find unbooked all-day (recurring everyday) slots for a charger
        List<Slot> findByChargerIdAndAllDayTrueAndBookedFalse(Long chargerId);
}
