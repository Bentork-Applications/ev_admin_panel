package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.SessionDTO;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.service.interfaces.ISessionService;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sessions")
public class SessionController {
    private final ISessionService sessionService;
                    
	@PostMapping("/start")
	public ResponseEntity<Map<String, Object>> startSession(
			@RequestBody SessionDTO request,
			@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
		log.info("POST /api/sessions/start - chargerId={}", request.getChargerId());
		try {
			Map<String, Object> result = sessionService.startSession(userDetails.getUsername(), request);
			return ResponseEntity.ok(result);
		} catch (RuntimeException e) {
			log.error("POST /api/sessions/start - Failed: {}", e.getMessage());
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
		} catch (Exception e) {
			log.error("POST /api/sessions/start - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "Failed to start session"));
		}
	}

	@PostMapping("/stop")
	public ResponseEntity<Map<String, Object>> stopSession(
			@RequestBody SessionDTO request,
			@AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
		log.info("POST /api/sessions/stop - sessionId={}", request.getSessionId());
		try {
			Map<String, Object> result = sessionService.stopSession(userDetails.getUsername(), request);
			return ResponseEntity.ok(result);
		} catch (RuntimeException e) {
			log.error("POST /api/sessions/stop - Failed, sessionId={}: {}", request.getSessionId(), e.getMessage());
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
		} catch (Exception e) {
			log.error("POST /api/sessions/stop - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "Failed to stop session"));
		}
	}

	@GetMapping("/total")
	public ResponseEntity<Long> getTotalSessions() {
		log.debug("GET /api/sessions/total - Request received");

		try {
			// ensureAdmin(authHeader);
			Long total = sessionService.getTotalSessions();
			log.debug("GET /api/sessions/total - Success, total={}", total);
			return ResponseEntity.ok(total);
		} catch (Exception e) {
			log.error("GET /api/sessions/total - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	// @PreAuthorize("hasAuthority('ADMIN')")
	@GetMapping("/energy")
	public ResponseEntity<Double> getTotalEnergy() {
		log.debug("GET /api/sessions/energy - Request received");

		try {
			// ensureAdmin(authHeader);
			Double totalEnergy = sessionService.getTotalEnergyConsumed();
			log.debug("GET /api/sessions/energy - Success, totalEnergy={} kWh", totalEnergy);
			return ResponseEntity.ok(totalEnergy);
		} catch (Exception e) {
			log.error("GET /api/sessions/energy - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	// Active Sessions Count
	@GetMapping("/active")
	public ResponseEntity<Long> getActiveSessions() {
		log.debug("GET /api/sessions/active - Request received");

		try {
			Long active = sessionService.getActiveSessions();
			log.debug("GET /api/sessions/active - Success, active={}", active);
			return ResponseEntity.ok(active);
		} catch (Exception e) {
			log.error("GET /api/sessions/active - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	// Active Sessions with Details (userId, sessionId, status)
	@GetMapping("/active/details")
	public ResponseEntity<List<Map<String, Object>>> getActiveSessionDetails() {
		log.debug("GET /api/sessions/active/details - Request received");

		try {
			List<Map<String, Object>> activeSessions = sessionService.getActiveSessionDetails();
			log.debug("GET /api/sessions/active/details - Success, count={}", activeSessions.size());
			return ResponseEntity.ok(activeSessions);
		} catch (Exception e) {
			log.error("GET /api/sessions/active/details - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	// Average Uptime
	@GetMapping("/uptime")
	public ResponseEntity<Double> getAverageUptime() {
		log.debug("GET /api/sessions/uptime - Request received");

		try {
			Double uptime = sessionService.getAverageUptime();
			log.debug("GET /api/sessions/uptime - Success, uptime={}%", uptime);
			return ResponseEntity.ok(uptime);
		} catch (Exception e) {
			log.error("GET /api/sessions/uptime - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	/**
	 * Get specific session energy consumed (kWh) by Session ID.
	 * Returns 0.0 if session just started or no energy recorded yet.
	 */
	@GetMapping("/{sessionId}/energy")
	public ResponseEntity<Double> getSessionEnergy(
			@PathVariable Long sessionId) {

		log.debug("GET /api/sessions/{}/energy - Request received", sessionId);

		try {
			Session session = sessionService.getSessionById(sessionId);
			if (session == null) {
				log.warn("GET /api/sessions/{}/energy - Session not found", sessionId);
				return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
			}

			// No null check needed because 'double' is primitive
			double energy = session.getEnergyKwh();

			log.debug("GET /api/sessions/{}/energy - Success, energy={} kWh", sessionId, energy);
			return ResponseEntity.ok(energy);

		} catch (Exception e) {
			log.error("GET /api/sessions/{}/energy - Failed: {}", sessionId, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
		}
	}

	/**
	 * Get specific session status by Session ID.
	 */
	@GetMapping("/{sessionId}/status")
	public ResponseEntity<String> getSessionStatus(
			@PathVariable Long sessionId) {

		log.debug("GET /api/sessions/{}/status - Request received", sessionId);

		try {
			Session session = sessionService.getSessionById(sessionId);
			if (session == null) {
				log.warn("GET /api/sessions/{}/status - Session not found", sessionId);
				return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
			}

			String status = session.getStatus();

			log.debug("GET /api/sessions/{}/status - Success, status={}", sessionId, status);
			return ResponseEntity.ok(status);

		} catch (Exception e) {
			log.error("GET /api/sessions/{}/status - Failed: {}", sessionId, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error fetching status");
		}
	}

	// ERROR TODAY
	@GetMapping("/error/today")
	public ResponseEntity<Long> getTodaysError() {
		try {
			log.debug("Calling session service to get todays total errors");
			Long count = sessionService.getTodaysErrorCount();
			return ResponseEntity.ok(count);
		} catch (DataAccessException e) {
			log.error("Error while accessing data: {}", e);
			return ResponseEntity.internalServerError().build();
		} catch (Exception e) {
			log.error("Global error: {}", e);
			return ResponseEntity.internalServerError().build();
		}
	}

	// list of session
	@GetMapping("/all/records")
	public ResponseEntity<List<Session>> getAllSessionRecords() {
		try {
			log.debug("Calling session service to get all session records");
			List<Session> allRecords = sessionService.getallSessionRecords();
			return ResponseEntity.ok(allRecords);
		} catch (DataAccessException e) {
			log.error("Error while accessing data: {}", e);
			return ResponseEntity.internalServerError().build();
		} catch (Exception e) {
			log.error("Global error: {}", e);
			return ResponseEntity.internalServerError().build();
		}
	}
}