package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.Revenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RevenueRepository extends JpaRepository<Revenue, Long> {
    // Use underscore for nested property traversal: object_property
    List<Revenue> findBySession_Id(Long sessionId);

    List<Revenue> findByUser_Id(Long userId);

    List<Revenue> findByCharger_Id(Long chargerId);

    List<Revenue> findByStation_Id(Long stationId);

    // Find revenue by multiple station IDs
    @Query("SELECT r FROM Revenue r WHERE r.station.id IN :stationIds")
    List<Revenue> findByStationIdIn(@Param("stationIds") List<Long> stationIds);

    // Sum total revenue by station ID
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.station.id = :stationId")
    Double sumAmountByStationId(@Param("stationId") Long stationId);

    // Sum total revenue by multiple station IDs
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE r.station.id IN :stationIds")
    Double sumAmountByStationIdIn(@Param("stationIds") List<Long> stationIds);

    // Count revenue entries by station ID
    Long countByStation_Id(Long stationId);

    // Efficient aggregation queries — replace findAll().stream().filter()
    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Revenue r WHERE UPPER(r.paymentStatus) = UPPER(:status)")
    double sumAmountByPaymentStatus(@Param("status") String status);

    long countByPaymentStatusIgnoreCase(String paymentStatus);
}
