package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.model.Session;

/**
 * Interface for sending OCPP remote commands to physical chargers.
 * Decouples session lifecycle from the WebSocket transport layer,
 * eliminating the circular dependency between SessionService and OcppWebSocketServer.
 */
public interface IChargerCommandService {
    boolean sendRemoteStart(Session session);
    boolean sendRemoteStop(Session session);
}
