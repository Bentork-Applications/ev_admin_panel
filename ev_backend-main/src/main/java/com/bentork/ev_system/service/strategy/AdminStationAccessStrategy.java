package com.bentork.ev_system.service.strategy;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.mapper.StationMapper;
import com.bentork.ev_system.repository.StationRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Admin station access strategy - provides full access to all stations.
 * Follows Single Responsibility Principle (SRP) - only handles admin access
 * logic.
 * Follows Liskov Substitution Principle (LSP) - can be substituted for any
 * StationAccessStrategy.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class AdminStationAccessStrategy implements StationAccessStrategy {

    private final StationRepository stationRepository;

    @Override
    public List<StationDTO> getAccessibleStations(String userEmail) {
        log.debug("Admin {} accessing all stations", userEmail);
        return stationRepository.findAll().stream()
                .map(StationMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasAccessToStation(String userEmail, Long stationId) {
        // Admin has access to all stations
        log.debug("Admin {} checking access to station {}", userEmail, stationId);
        return stationRepository.existsById(stationId);
    }

    @Override
    public Long getAccessibleStationsCount(String userEmail) {
        return stationRepository.count();
    }

    @Override
    public String getSupportedRole() {
        return "ADMIN";
    }
}
