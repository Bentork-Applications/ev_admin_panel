package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.PlanAssignmentDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.service.PlanAssignmentService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/plan-assignments")
public class PlanAssignmentController {

	private final PlanAssignmentService planAssignmentService;
	private final AdminRepository adminRepository;

	/**
	 * Assign a plan to a station (applies to all chargers in that station).
	 */
	@PreAuthorize("hasAuthority('ADMIN')")
	@PostMapping("/station")
	public ResponseEntity<?> assignToStation(@RequestBody PlanAssignmentDTO dto, Authentication authentication) {
		String adminEmail = authentication.getName();
		log.info("POST /api/plan-assignments/station - planId={}, stationId={}, admin={}",
				dto.getPlanId(), dto.getStationId(), adminEmail);

		try {
			Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
			if (admin.isEmpty()) {
				log.warn("POST /api/plan-assignments/station - Admin not found: {}", adminEmail);
				return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin not found");
			}

			PlanAssignmentDTO result = planAssignmentService.assignPlanToStation(
					dto.getPlanId(), dto.getStationId(), admin.get().getId());

			log.info("POST /api/plan-assignments/station - Success, assignmentId={}", result.getId());
			return ResponseEntity.status(HttpStatus.CREATED).body(result);
		} catch (EntityNotFoundException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		} catch (IllegalStateException e) {
			return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
		} catch (Exception e) {
			log.error("POST /api/plan-assignments/station - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to assign plan to station");
		}
	}

	/**
	 * Assign a plan to a specific charger (applies to only that charger).
	 */
	@PreAuthorize("hasAuthority('ADMIN')")
	@PostMapping("/charger")
	public ResponseEntity<?> assignToCharger(@RequestBody PlanAssignmentDTO dto, Authentication authentication) {
		String adminEmail = authentication.getName();
		log.info("POST /api/plan-assignments/charger - planId={}, chargerId={}, admin={}",
				dto.getPlanId(), dto.getChargerId(), adminEmail);

		try {
			Optional<Admin> admin = adminRepository.findByEmail(adminEmail);
			if (admin.isEmpty()) {
				log.warn("POST /api/plan-assignments/charger - Admin not found: {}", adminEmail);
				return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin not found");
			}

			PlanAssignmentDTO result = planAssignmentService.assignPlanToCharger(
					dto.getPlanId(), dto.getChargerId(), admin.get().getId());

			log.info("POST /api/plan-assignments/charger - Success, assignmentId={}", result.getId());
			return ResponseEntity.status(HttpStatus.CREATED).body(result);
		} catch (EntityNotFoundException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		} catch (IllegalStateException e) {
			return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
		} catch (Exception e) {
			log.error("POST /api/plan-assignments/charger - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to assign plan to charger");
		}
	}

	/**
	 * Soft-delete a plan assignment (no cascade).
	 */
	@PreAuthorize("hasAuthority('ADMIN')")
	@DeleteMapping("/{id}")
	public ResponseEntity<?> removeAssignment(@PathVariable Long id) {
		log.info("DELETE /api/plan-assignments/{} - Request received", id);

		try {
			planAssignmentService.removeAssignment(id);
			log.info("DELETE /api/plan-assignments/{} - Success", id);
			return ResponseEntity.ok("Plan assignment removed");
		} catch (EntityNotFoundException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		} catch (Exception e) {
			log.error("DELETE /api/plan-assignments/{} - Failed: {}", id, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to remove plan assignment");
		}
	}

	/**
	 * Get all plan assignments for a station (station-level only).
	 */
	@GetMapping("/station/{stationId}")
	public ResponseEntity<?> getByStation(@PathVariable Long stationId) {
		log.info("GET /api/plan-assignments/station/{} - Request received", stationId);

		try {
			List<PlanAssignmentDTO> assignments = planAssignmentService.getAssignmentsByStation(stationId);
			return ResponseEntity.ok(assignments);
		} catch (Exception e) {
			log.error("GET /api/plan-assignments/station/{} - Failed: {}", stationId, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to fetch station assignments");
		}
	}

	/**
	 * Get all plan assignments directly assigned to a charger (charger-level only).
	 */
	@GetMapping("/charger/{chargerId}")
	public ResponseEntity<?> getByCharger(@PathVariable Long chargerId) {
		log.info("GET /api/plan-assignments/charger/{} - Request received", chargerId);

		try {
			List<PlanAssignmentDTO> assignments = planAssignmentService.getAssignmentsByCharger(chargerId);
			return ResponseEntity.ok(assignments);
		} catch (Exception e) {
			log.error("GET /api/plan-assignments/charger/{} - Failed: {}", chargerId, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to fetch charger assignments");
		}
	}

	/**
	 * Get the effective (resolved) plans for a charger.
	 * Charger-level assignments take precedence; falls back to station-level.
	 */
	@GetMapping("/charger/{chargerId}/effective")
	public ResponseEntity<?> getEffective(@PathVariable Long chargerId) {
		log.info("GET /api/plan-assignments/charger/{}/effective - Request received", chargerId);

		try {
			List<PlanAssignmentDTO> effectivePlans = planAssignmentService.getEffectivePlansForCharger(chargerId);
			return ResponseEntity.ok(effectivePlans);
		} catch (EntityNotFoundException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		} catch (Exception e) {
			log.error("GET /api/plan-assignments/charger/{}/effective - Failed: {}", chargerId, e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to fetch effective plans");
		}
	}

	/**
	 * Get all active plan assignments.
	 */
	@PreAuthorize("hasAuthority('ADMIN')")
	@GetMapping("/all")
	public ResponseEntity<?> getAll() {
		log.info("GET /api/plan-assignments/all - Request received");

		try {
			List<PlanAssignmentDTO> assignments = planAssignmentService.getAllAssignments();
			return ResponseEntity.ok(assignments);
		} catch (Exception e) {
			log.error("GET /api/plan-assignments/all - Failed: {}", e.getMessage(), e);
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("Failed to fetch all assignments");
		}
	}
}
