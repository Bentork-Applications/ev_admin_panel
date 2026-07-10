package com.bentork.ev_system.exception.domain;

public class UnauthorizedSessionAccessException extends RuntimeException {

    public UnauthorizedSessionAccessException(Long userId, Long sessionId) {
        super("User " + userId + " is not authorized to access session " + sessionId);
    }
}
