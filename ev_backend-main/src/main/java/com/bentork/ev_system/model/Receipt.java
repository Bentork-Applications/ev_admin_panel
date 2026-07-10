package com.bentork.ev_system.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "receipts")
public class Receipt {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	@ManyToOne
	private User user;

	@ManyToOne
	private Charger charger;

	@Column(name = "session_type")
	private String sessionType; // "MONEY_BASED" or "CUSTOM"

	private BigDecimal amount; // Total prepaid amount

	private BigDecimal selectedKwh; // ✅ NEW - kWh purchased (for package/custom)

	// PENDING, PAID, REFUNDED, FINALIZED
	private String status;

	private LocalDateTime createdAt = LocalDateTime.now();
	private LocalDateTime updatedAt;

	@OneToOne
	private Session session;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public Charger getCharger() {
		return charger;
	}

	public void setCharger(Charger charger) {
		this.charger = charger;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public void setAmount(BigDecimal amount) {
		this.amount = amount;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}

	public Session getSession() {
		return session;
	}

	public void setSession(Session session) {
		this.session = session;
	}

	public BigDecimal getSelectedKwh() {
		return selectedKwh;
	}

	public void setSelectedKwh(BigDecimal selectedKwh) {
		this.selectedKwh = selectedKwh;
	}

	public String getSessionType() {
		return sessionType;
	}

	public void setSessionType(String sessionType) {
		this.sessionType = sessionType;
	}

}
