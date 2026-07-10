package com.bentork.ev_system.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.DealerStationDTO;
import com.bentork.ev_system.mapper.DealerStationMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.DealerStation;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.DealerStationRepository;
import com.bentork.ev_system.repository.StationRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Service for managing dealer-station assignments.
 * Only Admin can assign/remove stations to/from dealers.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DealerStationService {

    private final DealerStationRepository dealerStationRepository;

    private final AdminRepository adminRepository;

    private final StationRepository stationRepository;

    /**
     * Assign multiple stations to a dealer (Admin only)
     * 
     * @param dealerId   ID of the dealer
     * @param stationIds List of station IDs to assign
     * @return List of created assignments
     */
    @Transactional
    public List<DealerStationDTO> assignStationsToDealer(Long dealerId, List<Long> stationIds) {
        Admin dealer = adminRepository.findById(dealerId)
                .orElseThrow(() -> new EntityNotFoundException("Dealer not found with ID: " + dealerId));

        if (!"DEALER".equals(dealer.getRole())) {
            throw new IllegalArgumentException("Admin with ID " + dealerId + " is not a dealer");
        }

        List<DealerStationDTO> assignments = new ArrayList<>();

        for (Long stationId : stationIds) {
            // Skip if already assigned
            if (dealerStationRepository.existsByDealerIdAndStationId(dealerId, stationId)) {
                log.info("Station {} already assigned to dealer {}, skipping", stationId, dealerId);
                continue;
            }

            Station station = stationRepository.findById(stationId)
                    .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + stationId));

            DealerStation dealerStation = new DealerStation();
            dealerStation.setDealer(dealer);
            dealerStation.setStation(station);

            DealerStation saved = dealerStationRepository.save(dealerStation);
            assignments.add(DealerStationMapper.toDTO(saved));

            log.info("Assigned station {} to dealer {}", stationId, dealerId);
        }

        return assignments;
    }

    /**
     * Remove a station assignment from a dealer (Admin only)
     * 
     * @param dealerId  ID of the dealer
     * @param stationId ID of the station to remove
     */
    @Transactional
    public void removeStationFromDealer(Long dealerId, Long stationId) {
        if (!dealerStationRepository.existsByDealerIdAndStationId(dealerId, stationId)) {
            throw new EntityNotFoundException(
                    "Assignment not found for dealer " + dealerId + " and station " + stationId);
        }

        dealerStationRepository.deleteByDealerIdAndStationId(dealerId, stationId);
        log.info("Removed station {} from dealer {}", stationId, dealerId);
    }

    /**
     * Get all stations assigned to a dealer
     * 
     * @param dealerId ID of the dealer
     * @return List of dealer-station assignments
     */
    public List<DealerStationDTO> getDealerStations(Long dealerId) {
        if (!adminRepository.existsById(dealerId)) {
            throw new EntityNotFoundException("Dealer not found with ID: " + dealerId);
        }

        return dealerStationRepository.findByDealerId(dealerId).stream()
                .map(DealerStationMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all dealers assigned to a station
     * 
     * @param stationId ID of the station
     * @return List of dealer-station assignments
     */
    public List<DealerStationDTO> getStationDealers(Long stationId) {
        if (!stationRepository.existsById(stationId)) {
            throw new EntityNotFoundException("Station not found with ID: " + stationId);
        }

        return dealerStationRepository.findByStationId(stationId).stream()
                .map(DealerStationMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all dealer-station assignments
     * 
     * @return List of all assignments
     */
    public List<DealerStationDTO> getAllAssignments() {
        return dealerStationRepository.findAll().stream()
                .map(DealerStationMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Check if a dealer has access to a station
     * 
     * @param dealerEmail Email of the dealer
     * @param stationId   ID of the station
     * @return true if dealer has access
     */
    public boolean hasAccess(String dealerEmail, Long stationId) {
        Admin dealer = adminRepository.findByEmail(dealerEmail)
                .orElseThrow(() -> new EntityNotFoundException("Dealer not found with email: " + dealerEmail));

        return dealerStationRepository.existsByDealerIdAndStationId(dealer.getId(), stationId);
    }

    /**
     * Get count of stations assigned to a dealer
     * 
     * @param dealerId ID of the dealer
     * @return Count of assigned stations
     */
    public Long getDealerStationCount(Long dealerId) {
        return dealerStationRepository.countByDealerId(dealerId);
    }
}
