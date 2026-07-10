package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.DealerStation;
import com.bentork.ev_system.model.Station;

@Repository
public interface DealerStationRepository extends JpaRepository<DealerStation, Long> {

    /**
     * Find all dealer-station mappings for a specific dealer
     */
    List<DealerStation> findByDealerId(Long dealerId);

    /**
     * Find all dealer-station mappings for a specific station
     */
    List<DealerStation> findByStationId(Long stationId);

    /**
     * Check if a specific dealer-station mapping exists
     */
    boolean existsByDealerIdAndStationId(Long dealerId, Long stationId);

    /**
     * Delete a specific dealer-station mapping
     */
    void deleteByDealerIdAndStationId(Long dealerId, Long stationId);

    /**
     * Get all station IDs assigned to a dealer
     */
    @Query("SELECT ds.station.id FROM DealerStation ds WHERE ds.dealer.id = :dealerId")
    List<Long> findStationIdsByDealerId(@Param("dealerId") Long dealerId);

    /**
     * Get all stations assigned to a dealer
     */
    @Query("SELECT ds.station FROM DealerStation ds WHERE ds.dealer.id = :dealerId")
    List<Station> findStationsByDealerId(@Param("dealerId") Long dealerId);

    /**
     * Count stations assigned to a dealer
     */
    long countByDealerId(Long dealerId);

    /**
     * Find dealer-station mapping by dealer email
     */
    @Query("SELECT ds FROM DealerStation ds WHERE ds.dealer.email = :email")
    List<DealerStation> findByDealerEmail(@Param("email") String email);

    /**
     * Get all stations assigned to a dealer by dealer email
     */
    @Query("SELECT ds.station FROM DealerStation ds WHERE ds.dealer.email = :email")
    List<Station> findStationsByDealerEmail(@Param("email") String email);
}
