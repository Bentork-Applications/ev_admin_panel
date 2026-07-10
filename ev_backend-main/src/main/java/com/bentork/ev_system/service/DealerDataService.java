package com.bentork.ev_system.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.response.RevenueDTO;
import com.bentork.ev_system.dto.response.SessionDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Revenue;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.DealerStationRepository;
import com.bentork.ev_system.repository.RevenueRepository;
import com.bentork.ev_system.repository.SessionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Service for dealers to access data from their assigned stations only.
 * Returns DTOs to avoid Hibernate proxy serialization issues.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DealerDataService {

    private final DealerStationRepository dealerStationRepository;

    private final AdminRepository adminRepository;

    private final SessionRepository sessionRepository;

    private final RevenueRepository revenueRepository;

    private final ChargerRepository chargerRepository;

    // ==================== HELPER METHODS ====================

    public List<Long> getDealerStationIds(String dealerEmail) {
        Admin dealer = adminRepository.findByEmail(dealerEmail)
                .orElseThrow(() -> new EntityNotFoundException("Dealer not found: " + dealerEmail));

        if (!"DEALER".equals(dealer.getRole())) {
            throw new IllegalArgumentException("User is not a dealer");
        }

        return dealerStationRepository.findStationIdsByDealerId(dealer.getId());
    }

    public boolean hasAccessToStation(String dealerEmail, Long stationId) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        return stationIds.contains(stationId);
    }

    // ==================== DTO MAPPERS ====================

    private SessionDTO toSessionDTO(Session session) {
        if (session == null)
            return null;

        SessionDTO.SessionDTOBuilder builder = SessionDTO.builder()
                .id(session.getId())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .energyKwh(session.getEnergyKwh())
                .cost(session.getCost())
                .status(session.getStatus())
                .sourceType(session.getSourceType())
                .chargingDurationSeconds(session.getChargingDurationSeconds())
                .createdAt(session.getCreatedAt());

        // Safely extract IDs and names
        if (session.getUser() != null) {
            builder.userId(session.getUser().getId());
            builder.userName(session.getUser().getName());
        }

        if (session.getCharger() != null) {
            builder.chargerId(session.getCharger().getId());
            builder.chargerName(session.getCharger().getOcppId());

            if (session.getCharger().getStation() != null) {
                builder.stationId(session.getCharger().getStation().getId());
                builder.stationName(session.getCharger().getStation().getName());
            }
        }

        return builder.build();
    }

    private RevenueDTO toRevenueDTO(Revenue revenue) {
        if (revenue == null)
            return null;

        RevenueDTO.RevenueDTOBuilder builder = RevenueDTO.builder()
                .id(revenue.getId())
                .amount(revenue.getAmount())
                .paymentMethod(revenue.getPaymentMethod())
                .transactionId(revenue.getTransactionId())
                .paymentStatus(revenue.getPaymentStatus())
                .createdAt(revenue.getCreatedAt());

        // Safely extract IDs - avoid triggering lazy load exceptions
        try {
            if (revenue.getSession() != null) {
                builder.sessionId(revenue.getSession().getId());
            }
        } catch (Exception e) {
            log.debug("Session not loaded for revenue {}", revenue.getId());
        }

        try {
            if (revenue.getUser() != null) {
                builder.userId(revenue.getUser().getId());
                builder.userName(revenue.getUser().getName());
            }
        } catch (Exception e) {
            log.debug("User not loaded for revenue {}", revenue.getId());
        }

        try {
            if (revenue.getCharger() != null) {
                builder.chargerId(revenue.getCharger().getId());
            }
        } catch (Exception e) {
            log.debug("Charger not loaded for revenue {}", revenue.getId());
        }

        try {
            if (revenue.getStation() != null) {
                builder.stationId(revenue.getStation().getId());
                builder.stationName(revenue.getStation().getName());
            }
        } catch (Exception e) {
            log.debug("Station not loaded for revenue {}", revenue.getId());
        }

        return builder.build();
    }

    // ==================== SESSION METHODS ====================

    public List<SessionDTO> getAllSessions(String dealerEmail) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        if (stationIds.isEmpty()) {
            log.info("Dealer {} has no assigned stations", dealerEmail);
            return new ArrayList<>();
        }

        log.info("Dealer {} fetching sessions for stations: {}", dealerEmail, stationIds);
        return sessionRepository.findByStationIdIn(stationIds).stream()
                .map(this::toSessionDTO)
                .collect(Collectors.toList());
    }

    public List<SessionDTO> getSessionsByStation(String dealerEmail, Long stationId) {
        if (!hasAccessToStation(dealerEmail, stationId)) {
            throw new SecurityException("Access denied to station: " + stationId);
        }

        log.info("Dealer {} fetching sessions for station {}", dealerEmail, stationId);
        return sessionRepository.findByStationId(stationId).stream()
                .map(this::toSessionDTO)
                .collect(Collectors.toList());
    }

    public Long getTotalSessionCount(String dealerEmail) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        if (stationIds.isEmpty())
            return 0L;
        return (long) sessionRepository.findByStationIdIn(stationIds).size();
    }

    // ==================== REVENUE METHODS ====================

    public List<RevenueDTO> getAllRevenue(String dealerEmail) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        if (stationIds.isEmpty()) {
            log.info("Dealer {} has no assigned stations", dealerEmail);
            return new ArrayList<>();
        }

        log.info("Dealer {} fetching revenue for stations: {}", dealerEmail, stationIds);
        return revenueRepository.findByStationIdIn(stationIds).stream()
                .map(this::toRevenueDTO)
                .collect(Collectors.toList());
    }

    public List<RevenueDTO> getRevenueByStation(String dealerEmail, Long stationId) {
        if (!hasAccessToStation(dealerEmail, stationId)) {
            throw new SecurityException("Access denied to station: " + stationId);
        }

        log.info("Dealer {} fetching revenue for station {}", dealerEmail, stationId);
        return revenueRepository.findByStation_Id(stationId).stream()
                .map(this::toRevenueDTO)
                .collect(Collectors.toList());
    }

    public Double getTotalRevenueAmount(String dealerEmail) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        if (stationIds.isEmpty()) {
            return 0.0;
        }
        Double total = revenueRepository.sumAmountByStationIdIn(stationIds);
        return total != null ? total : 0.0;
    }

    public Double getRevenueAmountByStation(String dealerEmail, Long stationId) {
        if (!hasAccessToStation(dealerEmail, stationId)) {
            throw new SecurityException("Access denied to station: " + stationId);
        }
        Double total = revenueRepository.sumAmountByStationId(stationId);
        return total != null ? total : 0.0;
    }

    // ==================== CHARGER METHODS ====================

    public List<Charger> getAllChargers(String dealerEmail) {
        List<Long> stationIds = getDealerStationIds(dealerEmail);
        if (stationIds.isEmpty()) {
            return new ArrayList<>();
        }

        log.info("Dealer {} fetching chargers for stations: {}", dealerEmail, stationIds);
        return stationIds.stream()
                .flatMap(stationId -> chargerRepository.findByStationId(stationId).stream())
                .collect(Collectors.toList());
    }

    public List<Charger> getChargersByStation(String dealerEmail, Long stationId) {
        if (!hasAccessToStation(dealerEmail, stationId)) {
            throw new SecurityException("Access denied to station: " + stationId);
        }

        log.info("Dealer {} fetching chargers for station {}", dealerEmail, stationId);
        return chargerRepository.findByStationId(stationId);
    }

    // ==================== STATION METHODS ====================

    public List<Station> getAllStations(String dealerEmail) {
        log.info("Dealer {} fetching their assigned stations", dealerEmail);
        return dealerStationRepository.findStationsByDealerEmail(dealerEmail);
    }
}
