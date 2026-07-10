package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.PlanAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanAssignmentRepository extends JpaRepository<PlanAssignment, Long> {

	// Station-level assignments
	List<PlanAssignment> findByStationIdAndIsActiveTrue(Long stationId);

	// Charger-level assignments
	List<PlanAssignment> findByChargerIdAndIsActiveTrue(Long chargerId);

	// Duplicate checks
	Optional<PlanAssignment> findByPlanIdAndStationIdAndIsActiveTrue(Long planId, Long stationId);

	Optional<PlanAssignment> findByPlanIdAndChargerIdAndIsActiveTrue(Long planId, Long chargerId);

	// All assignments for a specific plan
	List<PlanAssignment> findByPlanIdAndIsActiveTrue(Long planId);

	// All active assignments
	List<PlanAssignment> findByIsActiveTrue();
}
