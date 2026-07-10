package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.StationReview;

@Repository
public interface StationReviewRepository extends JpaRepository<StationReview, Long> {

    // All reviews for a station (ordered newest first)
    List<StationReview> findByStationIdOrderByCreatedAtDesc(Long stationId);

    // Check if user already reviewed this station
    Optional<StationReview> findByStationIdAndUserId(Long stationId, Long userId);

    // Check existence
    boolean existsByStationIdAndUserId(Long stationId, Long userId);

    // Average rating for a station
    @Query("SELECT AVG(r.rating) FROM StationReview r WHERE r.station.id = :stationId")
    Double findAverageRatingByStationId(@Param("stationId") Long stationId);

    // Total review count for a station
    Long countByStationId(Long stationId);

    // All reviews by a specific user
    List<StationReview> findByUserIdOrderByCreatedAtDesc(Long userId);
}
