package com.bentork.ev_system.service.strategy;

import java.util.List;

import com.bentork.ev_system.dto.request.StationDTO;

/**
 * Strategy interface for station access control.
 * Follows Interface Segregation Principle (ISP) - focused interface for access
 * control.
 * Follows Open/Closed Principle (OCP) - add new roles by implementing this
 * interface.
 */
public interface StationAccessStrategy {

    /**
     * Get all stations accessible by the user
     * 
     * @param userEmail Email of the authenticated user
     * @return List of accessible stations
     */
    List<StationDTO> getAccessibleStations(String userEmail);

    /**
     * Check if user has access to a specific station
     * 
     * @param userEmail Email of the authenticated user
     * @param stationId ID of the station to check
     * @return true if user has access, false otherwise
     */
    boolean hasAccessToStation(String userEmail, Long stationId);

    /**
     * Get count of accessible stations for the user
     * 
     * @param userEmail Email of the authenticated user
     * @return Count of accessible stations
     */
    Long getAccessibleStationsCount(String userEmail);

    /**
     * Get the role this strategy handles
     * 
     * @return Role name (e.g., "ADMIN", "DEALER")
     */
    String getSupportedRole();
}
