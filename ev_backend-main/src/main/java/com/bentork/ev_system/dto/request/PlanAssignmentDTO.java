package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;

public class PlanAssignmentDTO {

	private Long id;
	private Long planId;
	private String planName;
	private Long stationId;
	private String stationName;
	private Long chargerId;
	private String chargerOcppId;
	private Long assignedBy;
	private Boolean isActive;
	private LocalDateTime assignedAt;

	// Getters & Setters

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getPlanId() {
		return planId;
	}

	public void setPlanId(Long planId) {
		this.planId = planId;
	}

	public String getPlanName() {
		return planName;
	}

	public void setPlanName(String planName) {
		this.planName = planName;
	}

	public Long getStationId() {
		return stationId;
	}

	public void setStationId(Long stationId) {
		this.stationId = stationId;
	}

	public String getStationName() {
		return stationName;
	}

	public void setStationName(String stationName) {
		this.stationName = stationName;
	}

	public Long getChargerId() {
		return chargerId;
	}

	public void setChargerId(Long chargerId) {
		this.chargerId = chargerId;
	}

	public String getChargerOcppId() {
		return chargerOcppId;
	}

	public void setChargerOcppId(String chargerOcppId) {
		this.chargerOcppId = chargerOcppId;
	}

	public Long getAssignedBy() {
		return assignedBy;
	}

	public void setAssignedBy(Long assignedBy) {
		this.assignedBy = assignedBy;
	}

	public Boolean getIsActive() {
		return isActive;
	}

	public void setIsActive(Boolean isActive) {
		this.isActive = isActive;
	}

	public LocalDateTime getAssignedAt() {
		return assignedAt;
	}

	public void setAssignedAt(LocalDateTime assignedAt) {
		this.assignedAt = assignedAt;
	}
}
