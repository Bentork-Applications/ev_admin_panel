package com.bentork.ev_system.dto.request;

import java.time.LocalDateTime;

public class StationDTO {

	private Long id;

	private Long locationId;

	private String name;

	// private String ocppId;
	//
	// private String type; // AC or DC

	private String status;

	private String directionLink;

	private LocalDateTime createdAt;

	private String locationName;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getLocationId() {
		return locationId;
	}

	public void setLocationId(Long locationId) {
		this.locationId = locationId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	// public String getOcppId() {
	// return ocppId;
	// }
	//
	// public void setOcppId(String ocppId) {
	// this.ocppId = ocppId;
	// }
	//
	// public String getType() {
	// return type;
	// }
	//
	// public void setType(String type) {
	// this.type = type;
	// }

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getDirectionLink() {
		return directionLink;
	}

	public void setDirectionLink(String directionLink) {
		this.directionLink = directionLink;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public String getLocationName() {
		return locationName;
	}

	public void setLocationName(String locationName) {
		this.locationName = locationName;
	}

	// Rating fields
	private Double averageRating;
	private Long totalReviews;

	public Double getAverageRating() {
		return averageRating;
	}

	public void setAverageRating(Double averageRating) {
		this.averageRating = averageRating;
	}

	public Long getTotalReviews() {
		return totalReviews;
	}

	public void setTotalReviews(Long totalReviews) {
		this.totalReviews = totalReviews;
	}

	// Active status for soft-delete
	private Boolean active;

	public Boolean getActive() {
		return active;
	}

	public void setActive(Boolean active) {
		this.active = active;
	}

}
