package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.Session;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interface for read-only session query operations.
 * Separates queries from session lifecycle management.
 */
public interface ISessionQueryService {
    long getTotalSessions();
    double getTotalEnergyConsumed();
    Long getActiveSessions();
    Double getAverageUptime();
    Session getSessionById(Long sessionId);
    Optional<Session> findLastActiveSession();
    Long getTodaysErrorCount();
    List<Session> getallSessionRecords();
    List<Map<String, Object>> getActiveSessionDetails();
}
