package com.bentork.ev_system.exception.domain;

public class SessionNotFoundException extends RuntimeException {
    private final Long sessionId;

    public SessionNotFoundException(Long sessionId) {
        super("Session not found with ID: " + sessionId);
        this.sessionId = sessionId;
    }

    public Long getSessionId() {
        return sessionId;
    }
}
