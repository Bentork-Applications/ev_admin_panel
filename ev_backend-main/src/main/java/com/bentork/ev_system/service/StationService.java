package com.bentork.ev_system.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.mapper.StationMapper;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Location;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.LocationRepository;
import com.bentork.ev_system.repository.StationRepository;
import com.bentork.ev_system.repository.StationReviewRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Service
@Slf4j
@RequiredArgsConstructor
public class StationService {

    private final StationRepository stationRepository;

    private final LocationRepository locationRepository;

    private final ChargerRepository chargerRepository;

    private final StationReviewRepository reviewRepository;

    private final Clock clock;

    @Caching(evict = {
        @CacheEvict(value = "stations", allEntries = true),
        @CacheEvict(value = "dashboard-stats", allEntries = true)
    })
    public StationDTO createStation(StationDTO dto) {
        try {
            Location location = locationRepository.findById(dto.getLocationId())
                    .orElseThrow(() -> new EntityNotFoundException("Location not found"));

            Station station = StationMapper.toEntity(dto);
            station.setLocation(location);

            Station saved = stationRepository.save(station);
            log.info("Station created: id={}, name={}, locationId={}",
                    saved.getId(), saved.getName(), location.getId());

            return StationMapper.toDTO(saved);
        } catch (EntityNotFoundException e) {
            log.error("Failed to create station - Location not found: locationId={}",
                    dto.getLocationId());
            throw e;
        } catch (Exception e) {
            log.error("Failed to create station: name={}, locationId={}: {}",
                    dto.getName(), dto.getLocationId(), e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "stations", key = "'all-stations'")
    public List<StationDTO> getAllStations() {
        try {
            List<StationDTO> stations = stationRepository.findByActiveTrue().stream()
                    .map(station -> {
                        StationDTO dto = StationMapper.toDTO(station);
                        enrichWithRatingData(dto, station.getId());
                        return dto;
                    })
                    .collect(Collectors.toList());

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} active stations", stations.size());
            }

            return stations;
        } catch (Exception e) {
            log.error("Failed to retrieve all stations: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "stations", key = "#id")
    public StationDTO getStationById(Long id) {
        try {
            Station station = stationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + id));

            if (log.isDebugEnabled()) {
                log.debug("Retrieved station: id={}, name={}", id, station.getName());
            }

            StationDTO dto = StationMapper.toDTO(station);
            enrichWithRatingData(dto, id);
            return dto;
        } catch (EntityNotFoundException e) {
            log.warn("Station not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to retrieve station: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Enriches a StationDTO with average rating and total reviews from the reviews
     * table.
     */
    private void enrichWithRatingData(StationDTO dto, Long stationId) {
        try {
            Double avgRating = reviewRepository.findAverageRatingByStationId(stationId);
            Long totalReviews = reviewRepository.countByStationId(stationId);
            dto.setAverageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
            dto.setTotalReviews(totalReviews != null ? totalReviews : 0L);
        } catch (Exception e) {
            log.warn("Failed to enrich station {} with rating data: {}", stationId, e.getMessage());
            dto.setAverageRating(0.0);
            dto.setTotalReviews(0L);
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "stations", allEntries = true),
        @CacheEvict(value = "dashboard-stats", allEntries = true)
    })
    public StationDTO updateStation(Long id, StationDTO dto) {
        try {
            Station station = stationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + id));

            Location location = locationRepository.findById(dto.getLocationId())
                    .orElseThrow(() -> new EntityNotFoundException("Location not found"));

            String oldStatus = station.getStatus();

            station.setName(dto.getName());
            station.setLocation(location);
            station.setStatus(dto.getStatus());
            station.setDirectionLink(dto.getDirectionLink());

            Station updated = stationRepository.save(station);

            log.info("Station updated: id={}, name={}, status changed from {} to {}",
                    id, updated.getName(), oldStatus, updated.getStatus());

            return StationMapper.toDTO(updated);
        } catch (EntityNotFoundException e) {
            log.warn("Failed to update station - Entity not found: stationId={}, message={}",
                    id, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to update station: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "stations", allEntries = true),
        @CacheEvict(value = "dashboard-stats", allEntries = true)
    })
    public void deleteStation(Long id) {
        try {
            Station station = stationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + id));
            
            // Soft-delete the station
            station.setActive(false);
            stationRepository.save(station);
            
            // Cascade: deactivate all chargers at this station
            List<Charger> chargers = chargerRepository.findByStationId(id);
            for (Charger charger : chargers) {
                charger.setActive(false);
                chargerRepository.save(charger);
            }
            
            log.info("Station soft-deleted (deactivated): id={}, cascaded to {} chargers", id, chargers.size());
        } catch (EntityNotFoundException e) {
            log.warn("Failed to deactivate station - Station not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to deactivate station: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "dashboard-stats", key = "'total-stations'")
    public Long getTotalStations() {
        try {
            Long total = stationRepository.countByActiveTrue();

            if (log.isDebugEnabled()) {
                log.debug("Total active stations count: {}", total);
            }

            return total;
        } catch (Exception e) {
            log.error("Failed to get total stations count: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "dashboard-stats", key = "'active-stations'")
    public Long getActiveStations() {
        try {
            Long activeCount = stationRepository.findByActiveTrue().stream()
                    .filter(station -> "ACTIVE".equalsIgnoreCase(station.getStatus()))
                    .count();

            if (log.isDebugEnabled()) {
                log.debug("Active stations count: {}", activeCount);
            }

            return activeCount;
        } catch (Exception e) {
            log.error("Failed to get active stations count: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "dashboard-stats", key = "'avg-uptime'")
    public Double getAverageUptime() {
        try {
            List<Station> stations = stationRepository.findByActiveTrue();

            if (stations.isEmpty()) {
                log.warn("No active stations found for uptime calculation");
                return 0.0;
            }

            double totalUptime = 0.0;
            int stationCount = 0;

            for (Station station : stations) {
                List<Charger> chargers = chargerRepository.findByStationIdAndActiveTrue(station.getId());

                if (!chargers.isEmpty()) {
                    long availableChargers = chargers.stream()
                            .filter(charger -> Boolean.TRUE.equals(charger.isAvailability()))
                            .count();

                    double stationUptime = (availableChargers * 100.0) / chargers.size();
                    totalUptime += stationUptime;
                    stationCount++;
                }
            }

            double avgUptime = stationCount > 0 ? totalUptime / stationCount : 0.0;
            double roundedUptime = Math.round(avgUptime * 100.0) / 100.0;

            log.info("Average uptime calculated: {}% across {} active stations",
                    roundedUptime, stationCount);

            return roundedUptime;
        } catch (Exception e) {
            log.error("Failed to calculate average uptime: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Error Today
    @Cacheable(value = "dashboard-stats", key = "'todays-error-count'")
    public Long getTodaysErrorCount() {
        try {
            LocalDate today = LocalDate.now(clock);
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);

            log.debug("Getting all active stations to count todays errors");
            List<Station> allStations = stationRepository.findByActiveTrue();

            return allStations.stream()
                    .filter(station -> station.getCreatedAt() != null
                            && (station.getCreatedAt().isEqual(startOfDay)
                                    || (station.getCreatedAt().isAfter(startOfDay)
                                            && station.getCreatedAt().isBefore(endOfDay))))
                    .filter(station -> station.getStatus() != null
                            && station.getStatus().toLowerCase().contains("error"))
                    .count();

        } catch (DataAccessException e) {
            log.error("Error while accessing data: {}", e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error in getTodaysErrorCount ", e);
            throw new RuntimeException("Failed to calculate today's error count", e);
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "stations", allEntries = true),
        @CacheEvict(value = "chargers", allEntries = true),
        @CacheEvict(value = "dashboard-stats", allEntries = true)
    })
    public void deactivateStation(Long id) {
        try {
            Station station = stationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + id));
            
            station.setActive(false);
            stationRepository.save(station);
            
            // Cascade: deactivate all chargers at this station
            List<Charger> chargers = chargerRepository.findByStationId(id);
            for (Charger charger : chargers) {
                charger.setActive(false);
                chargerRepository.save(charger);
            }
            
            log.info("Station deactivated: id={}, cascaded to {} chargers", id, chargers.size());
        } catch (EntityNotFoundException e) {
            log.warn("Failed to deactivate station - Station not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to deactivate station: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @Caching(evict = {
        @CacheEvict(value = "stations", allEntries = true),
        @CacheEvict(value = "chargers", allEntries = true),
        @CacheEvict(value = "dashboard-stats", allEntries = true)
    })
    public void reactivateStation(Long id) {
        try {
            Station station = stationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + id));
            
            station.setActive(true);
            stationRepository.save(station);
            
            log.info("Station reactivated: id={}", id);
        } catch (EntityNotFoundException e) {
            log.warn("Failed to reactivate station - Station not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to reactivate station: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}