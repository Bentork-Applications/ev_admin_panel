package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.PlanAssignmentDTO;
import com.bentork.ev_system.mapper.PlanAssignmentMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Plan;
import com.bentork.ev_system.model.PlanAssignment;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.PlanAssignmentRepository;
import com.bentork.ev_system.repository.PlanRepository;
import com.bentork.ev_system.repository.StationRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanAssignmentService {

	private final PlanAssignmentRepository planAssignmentRepository;
	private final PlanRepository planRepository;
	private final StationRepository stationRepository;
	private final ChargerRepository chargerRepository;
	private final AdminRepository adminRepository;

	/**
	 * Assign a plan to a station (applies to all chargers in that station).
	 */
	public PlanAssignmentDTO assignPlanToStation(Long planId, Long stationId, Long adminId) {
		try {
			Plan plan = planRepository.findById(planId)
					.orElseThrow(() -> new EntityNotFoundException("Plan not found with ID: " + planId));

			Station station = stationRepository.findById(stationId)
					.orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + stationId));

			Admin admin = adminRepository.findById(adminId)
					.orElseThrow(() -> new EntityNotFoundException("Admin not found with ID: " + adminId));

			// Check for duplicate assignment
			if (planAssignmentRepository.findByPlanIdAndStationIdAndIsActiveTrue(planId, stationId).isPresent()) {
				throw new IllegalStateException("This plan is already assigned to this station");
			}

			PlanAssignment assignment = new PlanAssignment();
			assignment.setPlan(plan);
			assignment.setStation(station);
			assignment.setAssignedBy(admin);

			PlanAssignment saved = planAssignmentRepository.save(assignment);
			log.info("Plan assigned to station: planId={}, stationId={}, assignmentId={}, adminId={}",
					planId, stationId, saved.getId(), adminId);

			return PlanAssignmentMapper.toDTO(saved);
		} catch (EntityNotFoundException | IllegalStateException e) {
			log.warn("Failed to assign plan to station: planId={}, stationId={}: {}",
					planId, stationId, e.getMessage());
			throw e;
		} catch (Exception e) {
			log.error("Unexpected error assigning plan to station: planId={}, stationId={}: {}",
					planId, stationId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Assign a plan to a specific charger (applies to only that charger).
	 */
	public PlanAssignmentDTO assignPlanToCharger(Long planId, Long chargerId, Long adminId) {
		try {
			Plan plan = planRepository.findById(planId)
					.orElseThrow(() -> new EntityNotFoundException("Plan not found with ID: " + planId));

			Charger charger = chargerRepository.findById(chargerId)
					.orElseThrow(() -> new EntityNotFoundException("Charger not found with ID: " + chargerId));

			Admin admin = adminRepository.findById(adminId)
					.orElseThrow(() -> new EntityNotFoundException("Admin not found with ID: " + adminId));

			// Check for duplicate assignment
			if (planAssignmentRepository.findByPlanIdAndChargerIdAndIsActiveTrue(planId, chargerId).isPresent()) {
				throw new IllegalStateException("This plan is already assigned to this charger");
			}

			PlanAssignment assignment = new PlanAssignment();
			assignment.setPlan(plan);
			assignment.setCharger(charger);
			assignment.setAssignedBy(admin);

			PlanAssignment saved = planAssignmentRepository.save(assignment);
			log.info("Plan assigned to charger: planId={}, chargerId={}, assignmentId={}, adminId={}",
					planId, chargerId, saved.getId(), adminId);

			return PlanAssignmentMapper.toDTO(saved);
		} catch (EntityNotFoundException | IllegalStateException e) {
			log.warn("Failed to assign plan to charger: planId={}, chargerId={}: {}",
					planId, chargerId, e.getMessage());
			throw e;
		} catch (Exception e) {
			log.error("Unexpected error assigning plan to charger: planId={}, chargerId={}: {}",
					planId, chargerId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Soft-delete a plan assignment. No cascade — only this specific assignment is deactivated.
	 */
	public void removeAssignment(Long assignmentId) {
		try {
			PlanAssignment assignment = planAssignmentRepository.findById(assignmentId)
					.orElseThrow(() -> new EntityNotFoundException("Plan assignment not found with ID: " + assignmentId));

			assignment.setIsActive(false);
			planAssignmentRepository.save(assignment);
			log.info("Plan assignment soft-deleted: assignmentId={}", assignmentId);
		} catch (EntityNotFoundException e) {
			log.warn("Failed to remove assignment - not found: assignmentId={}", assignmentId);
			throw e;
		} catch (Exception e) {
			log.error("Failed to remove assignment: assignmentId={}: {}", assignmentId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Get all active plan assignments for a station (station-level only).
	 */
	public List<PlanAssignmentDTO> getAssignmentsByStation(Long stationId) {
		try {
			List<PlanAssignmentDTO> assignments = planAssignmentRepository
					.findByStationIdAndIsActiveTrue(stationId)
					.stream()
					.map(PlanAssignmentMapper::toDTO)
					.collect(Collectors.toList());

			log.debug("Retrieved {} station-level assignments for stationId={}", assignments.size(), stationId);
			return assignments;
		} catch (Exception e) {
			log.error("Failed to get assignments for station: stationId={}: {}", stationId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Get all active plan assignments directly assigned to a charger (charger-level only).
	 */
	public List<PlanAssignmentDTO> getAssignmentsByCharger(Long chargerId) {
		try {
			List<PlanAssignmentDTO> assignments = planAssignmentRepository
					.findByChargerIdAndIsActiveTrue(chargerId)
					.stream()
					.map(PlanAssignmentMapper::toDTO)
					.collect(Collectors.toList());

			log.debug("Retrieved {} charger-level assignments for chargerId={}", assignments.size(), chargerId);
			return assignments;
		} catch (Exception e) {
			log.error("Failed to get assignments for charger: chargerId={}: {}", chargerId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Get the effective (resolved) plans for a charger.
	 * 
	 * Resolution logic:
	 * 1. If the charger has direct (charger-level) assignments → return those.
	 * 2. Otherwise → return the station-level assignments from the charger's parent station.
	 * 3. If neither exists → return empty list.
	 */
	public List<PlanAssignmentDTO> getEffectivePlansForCharger(Long chargerId) {
		try {
			// Step 1: Check charger-level assignments
			List<PlanAssignment> chargerAssignments = planAssignmentRepository
					.findByChargerIdAndIsActiveTrue(chargerId);

			if (!chargerAssignments.isEmpty()) {
				log.debug("Charger {} has {} direct assignment(s), returning charger-level plans",
						chargerId, chargerAssignments.size());
				return chargerAssignments.stream()
						.map(PlanAssignmentMapper::toDTO)
						.collect(Collectors.toList());
			}

			// Step 2: Fall back to station-level assignments
			Charger charger = chargerRepository.findById(chargerId)
					.orElseThrow(() -> new EntityNotFoundException("Charger not found with ID: " + chargerId));

			Long stationId = charger.getStation().getId();
			List<PlanAssignment> stationAssignments = planAssignmentRepository
					.findByStationIdAndIsActiveTrue(stationId);

			log.debug("Charger {} has no direct assignment, falling back to station {} with {} assignment(s)",
					chargerId, stationId, stationAssignments.size());

			return stationAssignments.stream()
					.map(PlanAssignmentMapper::toDTO)
					.collect(Collectors.toList());
		} catch (EntityNotFoundException e) {
			log.warn("Failed to get effective plans - charger not found: chargerId={}", chargerId);
			throw e;
		} catch (Exception e) {
			log.error("Failed to get effective plans for charger: chargerId={}: {}", chargerId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Get all active plan assignments.
	 */
	public List<PlanAssignmentDTO> getAllAssignments() {
		try {
			List<PlanAssignmentDTO> assignments = planAssignmentRepository
					.findByIsActiveTrue()
					.stream()
					.map(PlanAssignmentMapper::toDTO)
					.collect(Collectors.toList());

			log.info("Retrieved {} total active plan assignments", assignments.size());
			return assignments;
		} catch (Exception e) {
			log.error("Failed to get all assignments: {}", e.getMessage(), e);
			throw e;
		}
	}
}
