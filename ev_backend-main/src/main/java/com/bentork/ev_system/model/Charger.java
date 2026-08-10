package com.bentork.ev_system.model;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.bentork.ev_system.enums.ChargerStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Charger implements Serializable {

	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne
	@JoinColumn(name = "station_id", nullable = false)
	private Station station;

	@Column(nullable = false, unique = true)
	private String ocppId;

	@Column(nullable = false)
	private String connectorType;

	@Column(nullable = false)
	private String chargerType; // AC or DC

	@Column(nullable = false)
	private Double rate;

	@Column(name = "platform_fee_per_kwh")
	@Builder.Default
	private Double platformFeePerKwh = 0.0;

	@Column(name = "pst_percent")
	@Builder.Default
	private Double pstPercent = 0.0; // PST as percentage, e.g., 12.5 means 12.5%

	@Column(name = "kw_output")
	private Double kwOutput; // e.g., 7.4, 11.0, 22.0, 50.0

	private boolean isOccupied;

	private boolean availability;

	@Column(nullable = false)
	@Builder.Default
	private String status = ChargerStatus.OFFLINE.getValue(); // busy, available, offline, faulted

	@Builder.Default
	private LocalDateTime createdAt = LocalDateTime.now();

	@Column(name = "active", columnDefinition = "boolean default true")
	@Builder.Default
	private Boolean active = true;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Station getStation() {
		return station;
	}

	public void setStation(Station station) {
		this.station = station;
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

	public Double getKwOutput() {
		return kwOutput;
	}

	public void setKwOutput(Double kwOutput) {
		this.kwOutput = kwOutput;
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
