package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.SessionDTO;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interface for session management operations.
 * Decouples controllers and other services from the concrete SessionService implementation.
 */
public interface ISessionService {
    Map<String, Object> startSession(String email, SessionDTO request);
    Map<String, Object> stopSession(String email, SessionDTO request);
    Session startSessionFromReceipt(Receipt receipt, String boxId);
    void stopSessionBySystem(Long sessionId);
    void checkAndStopIfReachedKwh(Long sessionId, double currentKwh);
    Session activateOrRejectSession(String ocppId);
    Session getSessionById(Long sessionId);
    long getTotalSessions();
    double getTotalEnergyConsumed();
    Long getActiveSessions();
    Double getAverageUptime();
    Optional<Session> findLastActiveSession();
    Long getTodaysErrorCount();
    List<Session> getallSessionRecords();
    List<Map<String, Object>> getActiveSessionDetails();
}
