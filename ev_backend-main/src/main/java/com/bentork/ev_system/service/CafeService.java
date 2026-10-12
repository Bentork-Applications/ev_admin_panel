package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.CafeRequestDTO;
import com.bentork.ev_system.dto.response.CafeResponseDTO;
import com.bentork.ev_system.mapper.CafeMapper;
import com.bentork.ev_system.model.Cafe;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.CafeRepository;
import com.bentork.ev_system.repository.StationRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CafeService {

    private final CafeRepository cafeRepository;
    private final StationRepository stationRepository;
    private final GooglePlacesService googlePlacesService;

    // Approx degrees per meter
    private static final double LAT_DEGREE_IN_METERS = 111320.0;

    @CacheEvict(value = "cafes", allEntries = true)
    public CafeResponseDTO createCafe(CafeRequestDTO dto) {
        log.info("CafeService - Creating new cafe: {}", dto.getName());
        Station station = stationRepository.findById(dto.getStationId())
                .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + dto.getStationId()));

        Cafe cafe = CafeMapper.toEntity(dto);
        cafe.setStation(station);

        Cafe saved = cafeRepository.save(cafe);
        log.info("CafeService - Cafe created successfully with ID: {}", saved.getId());
        
        return CafeMapper.toResponseDTO(saved);
    }

    @CacheEvict(value = "cafes", allEntries = true)
    public CafeResponseDTO updateCafe(Long id, CafeRequestDTO dto) {
        log.info("CafeService - Updating cafe ID: {}", id);
        Cafe existing = cafeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cafe not found with ID: " + id));

        if (!existing.getStation().getId().equals(dto.getStationId())) {
            Station newStation = stationRepository.findById(dto.getStationId())
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + dto.getStationId()));
            existing.setStation(newStation);
        }

        existing.setName(dto.getName());
        existing.setGoogleMapLocation(dto.getGoogleMapLocation());
        existing.setGoogleMapImageUrl(dto.getGoogleMapImageUrl());
        existing.setRating(dto.getRating());
        existing.setIsOpen(dto.getIsOpen());
        existing.setLatitude(dto.getLatitude());
        existing.setLongitude(dto.getLongitude());
        existing.setAddress(dto.getAddress());
        existing.setCategory(dto.getCategory());

        Cafe updated = cafeRepository.save(existing);
        return CafeMapper.toResponseDTO(updated);
    }

    @CacheEvict(value = "cafes", allEntries = true)
    public void deleteCafe(Long id) {
        log.info("CafeService - Deleting cafe ID: {}", id);
        if (!cafeRepository.existsById(id)) {
            throw new EntityNotFoundException("Cafe not found with ID: " + id);
        }
        cafeRepository.deleteById(id);
    }

    @Cacheable(value = "cafes", key = "#id")
    public CafeResponseDTO getCafeById(Long id) {
        Cafe cafe = cafeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cafe not found with ID: " + id));
        return CafeMapper.toResponseDTO(cafe);
    }

    @Cacheable(value = "cafes", key = "'station-' + #stationId")
    public List<CafeResponseDTO> getCafesByStationId(Long stationId) {
        return cafeRepository.findByStationId(stationId).stream()
                .map(CafeMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "cafes", key = "'all-cafes'")
    public List<CafeResponseDTO> getAllCafes() {
        return cafeRepository.findAll().stream()
                .map(CafeMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Merges admin-added cafes with Google Places API cafes.
     * Admin cafes are prioritized at the top of the list.
     */
    public List<CafeResponseDTO> getNearbyCafesWithPriority(double latitude, double longitude, double radius) {
        log.info("CafeService - getNearbyCafesWithPriority - lat={}, lng={}, radius={}m", latitude, longitude, radius);
        
        List<CafeResponseDTO> mergedList = new ArrayList<>();

        try {
            // 1. Convert radius to bounding box
            double latDelta = radius / LAT_DEGREE_IN_METERS;
            double lngDelta = radius / (LAT_DEGREE_IN_METERS * Math.cos(Math.toRadians(latitude)));
            
            double minLat = latitude - latDelta;
            double maxLat = latitude + latDelta;
            double minLng = longitude - lngDelta;
            double maxLng = longitude + lngDelta;

            // 2. Fetch admin cafes within bounds
            List<Cafe> adminCafes = cafeRepository.findCafesWithinBounds(minLat, maxLat, minLng, maxLng);
            log.info("CafeService - Found {} admin cafes within radius", adminCafes.size());
            
            // Map admin cafes to DTOs and add to top of merged list
            adminCafes.stream()
                      .map(CafeMapper::toResponseDTO)
                      .forEach(mergedList::add);

        } catch (Exception e) {
            log.error("CafeService - Error fetching admin cafes from DB: {}", e.getMessage(), e);
            // Continue to fetch Google cafes even if DB fails
        }

        try {
            // 3. Fetch Google Places cafes
            List<CafeResponseDTO> googleCafes = googlePlacesService.findNearbyCafes(latitude, longitude, radius);
            log.info("CafeService - Found {} Google places cafes", googleCafes.size());
            
            // Mark them as not admin-added and append to list
            googleCafes.forEach(cafe -> {
                cafe.setAdminAdded(false);
                mergedList.add(cafe);
            });

        } catch (Exception e) {
            log.error("CafeService - Error fetching cafes from Google API: {}", e.getMessage(), e);
        }

        return mergedList;
    }
}
