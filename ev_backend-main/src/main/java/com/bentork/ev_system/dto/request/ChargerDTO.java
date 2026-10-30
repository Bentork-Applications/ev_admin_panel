package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChargerDTO {

	private Long id;
	private Long stationId;
	private String stationName;

	private String ocppId;
	private String connectorType;
	private String chargerType; // AC or DC
	private Double rate;
	private Double platformFeePerKwh;
	private Double pstPercent; // PST as percentage, e.g., 12.5 means 12.5%

	private boolean isOccupied;
	private boolean availability;

	private LocalDateTime createdAt; // Optional for response
	private String status; // busy, available, offline
	private Boolean active;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
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

	public String getOcppId() {
		return ocppId;
	}

	public void setOcppId(String ocppId) {
		this.ocppId = ocppId;
	}

	public String getConnectorType() {
		return connectorType;
	}

	public void setConnectorType(String connectorType) {
		this.connectorType = connectorType;
	}

	public String getChargerType() {
		return chargerType;
	}

	public void setChargerType(String chargerType) {
		this.chargerType = chargerType;
	}

	public Double getRate() {
		return rate;
	}

	public void setRate(Double rate) {
		this.rate = rate;
	}

	public Double getPlatformFeePerKwh() {
		return platformFeePerKwh;
	}

	public void setPlatformFeePerKwh(Double platformFeePerKwh) {
		this.platformFeePerKwh = platformFeePerKwh;
	}

	public Double getPstPercent() {
		return pstPercent;
	}

	public void setPstPercent(Double pstPercent) {
		this.pstPercent = pstPercent;
	}

	public boolean isOccupied() {
		return isOccupied;
	}

	public void setOccupied(boolean isOccupied) {
		this.isOccupied = isOccupied;
	}

	public boolean isAvailability() {
		return availability;
	}

	public void setAvailability(boolean availability) {
		this.availability = availability;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public Boolean getActive() {
		return active;
	}

	public void setActive(Boolean active) {
		this.active = active;
	}

}
