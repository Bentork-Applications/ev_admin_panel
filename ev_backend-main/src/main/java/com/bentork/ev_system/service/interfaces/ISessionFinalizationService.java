package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.Session;

import java.util.Map;

/**
 * Interface for session finalization operations.
 * Handles cost calculation, wallet refunds/debits, receipt finalization,
 * coin rewards, and referral processing.
 */
public interface ISessionFinalizationService {
    Map<String, Object> finalizeSession(Session session, String stopReason);
    Map<String, Object> buildAlreadyCompletedResponse(Session session);
}
