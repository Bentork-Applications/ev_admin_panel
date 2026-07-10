package com.bentork.ev_system.dto.request;

import java.math.BigDecimal;

public class PlanDTO {
	private Long id;
	private String planName;
	private String description;
	private Integer durationMin;
	private BigDecimal walletDeduction;
	private String chargerType;
	private BigDecimal rate;
	private Long createdBy; // for response purposes only
	private Boolean isActive;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getPlanName() {
		return planName;
	}

	public void setPlanName(String planName) {
		this.planName = planName;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Integer getDurationMin() {
		return durationMin;
	}

	public void setDurationMin(Integer durationMin) {
		this.durationMin = durationMin;
	}

	public BigDecimal getWalletDeduction() {
		return walletDeduction;
	}

	public void setWalletDeduction(BigDecimal walletDeduction) {
		this.walletDeduction = walletDeduction;
	}

	public String getChargerType() {
		return chargerType;
	}

	public void setChargerType(String chargerType) {
		this.chargerType = chargerType;
	}

	public BigDecimal getRate() {
		return rate;
	}

	public void setRate(BigDecimal rate) {
		this.rate = rate;
	}

	public Long getCreatedBy() {
		return createdBy;
	}

	public void setCreatedBy(Long createdBy) {
		this.createdBy = createdBy;
	}

	public Boolean getIsActive() {
		return isActive;
	}

	public void setIsActive(Boolean isActive) {
		this.isActive = isActive;
	}

}
