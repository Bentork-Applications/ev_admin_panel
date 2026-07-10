package com.bentork.ev_system.service;

import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.service.interfaces.ISessionQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Read-only session query service.
 * Extracted from SessionService to adhere to Single Responsibility Principle.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionQueryService implements ISessionQueryService {

    private final SessionRepository sessionRepository;
    private final Clock clock;

    @Override
    @Cacheable(value = "dashboard-stats", key = "'total-sessions'")
    public long getTotalSessions() {
        try {
            long total = sessionRepository.countByStatus(SessionStatus.COMPLETED.getValue());
            if (log.isDebugEnabled()) {
                log.debug("Total completed sessions: {}", total);
            }
            return total;
        } catch (Exception e) {
            log.error("Failed to get total sessions: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'total-energy'")
    public double getTotalEnergyConsumed() {
        try {
            double totalEnergy = sessionRepository.sumEnergyByStatus(SessionStatus.COMPLETED.getValue());
            if (log.isDebugEnabled()) {
                log.debug("Total energy consumed: {} kWh", totalEnergy);
            }
            return totalEnergy;
        } catch (Exception e) {
            log.error("Failed to get total energy consumed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'active-sessions'")
    public Long getActiveSessions() {
        try {
            long activeCount = sessionRepository.countByStatus(SessionStatus.ACTIVE.getValue());
            if (log.isDebugEnabled()) {
                log.debug("Active sessions count: {}", activeCount);
            }
            return activeCount;
        } catch (Exception e) {
            log.error("Failed to get active sessions: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'session-avg-uptime'")
    public Double getAverageUptime() {
        try {
            long totalSessions = sessionRepository.count();
            if (totalSessions == 0) {
                log.warn("No sessions found for uptime calculation");
                return 0.0;
            }
            long completedSessions = sessionRepository.countByStatus(SessionStatus.COMPLETED.getValue());
            double uptime = (completedSessions * 100.0) / totalSessions;
            double roundedUptime = Math.round(uptime * 100.0) / 100.0;
            log.info("Average uptime calculated: {}% (completed={}, total={})",
                    roundedUptime, completedSessions, totalSessions);
            return roundedUptime;
        } catch (Exception e) {
            log.error("Failed to calculate average uptime: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public Session getSessionById(Long sessionId) {
        if (log.isDebugEnabled()) {
            log.debug("Fetching session by ID: sessionId={}", sessionId);
        }
        return sessionRepository.findById(sessionId).orElse(null);
    }

    @Override
    public Optional<Session> findLastActiveSession() {
        if (log.isDebugEnabled()) {
            log.debug("Finding last active session");
        }
        return sessionRepository.findFirstByStatusOrderByStartTimeDesc(SessionStatus.ACTIVE.getValue());
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'todays-session-errors'")
    public Long getTodaysErrorCount() {
        try {
            LocalDate today = LocalDate.now(clock);
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);
            log.debug("Counting today's errors via DB query");
            return sessionRepository.countByStatusAndCreatedAtBetween(
                    SessionStatus.FAILED.getValue(), startOfDay, endOfDay);
        } catch (DataAccessException e) {
            log.error("Error while accessing data: {}", e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error in getTodaysErrorCount ", e);
            throw new RuntimeException("Failed to calculate today's error count", e);
        }
    }

    @Override
    public List<Session> getallSessionRecords() {
        try {
            log.debug("Getting all session records");
            return sessionRepository.findAll();
        } catch (DataAccessException e) {
            log.error("Error while accessing data: {}", e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error ", e);
            throw e;
        }
    }

    @Override
    public List<Map<String, Object>> getActiveSessionDetails() {
        try {
            log.info("Fetching active session details");
            List<String> activeStatuses = List.of(
                    SessionStatus.ACTIVE.getValue(),
                    SessionStatus.INITIATED.getValue());

            List<Session> activeSessions = sessionRepository.findByStatusInOrderByCreatedAtDesc(activeStatuses);

            List<Map<String, Object>> result = activeSessions.stream()
                    .map(session -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("sessionId", session.getId());
                        map.put("userId", session.getUser() != null ? session.getUser().getId() : null);
                        map.put("status", session.getStatus());
                        return map;
                    })
                    .toList();

            log.info("Found {} active sessions", result.size());
            return result;
        } catch (DataAccessException e) {
            log.error("Error fetching active session details: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error fetching active session details: {}", e.getMessage(), e);
            throw e;
        }
    }
}
