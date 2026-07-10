package com.bentork.ev_system.service.strategy;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.bentork.ev_system.dto.request.StationDTO;
import com.bentork.ev_system.mapper.StationMapper;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.DealerStationRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Dealer station access strategy - provides access only to assigned stations.
 * Follows Single Responsibility Principle (SRP) - only handles dealer access
 * logic.
 * Follows Liskov Substitution Principle (LSP) - can be substituted for any
 * StationAccessStrategy.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class DealerStationAccessStrategy implements StationAccessStrategy {

    private final DealerStationRepository dealerStationRepository;

    @Override
    public List<StationDTO> getAccessibleStations(String userEmail) {
        log.debug("Dealer {} accessing their assigned stations", userEmail);
        List<Station> stations = dealerStationRepository.findStationsByDealerEmail(userEmail);
        return stations.stream()
                .map(StationMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasAccessToStation(String userEmail, Long stationId) {
        log.debug("Dealer {} checking access to station {}", userEmail, stationId);
        List<Long> assignedStationIds = dealerStationRepository.findByDealerEmail(userEmail)
                .stream()
                .map(ds -> ds.getStation().getId())
                .collect(Collectors.toList());
        return assignedStationIds.contains(stationId);
    }

    @Override
    public Long getAccessibleStationsCount(String userEmail) {
        return (long) dealerStationRepository.findByDealerEmail(userEmail).size();
    }

    @Override
    public String getSupportedRole() {
        return "DEALER";
    }
}
