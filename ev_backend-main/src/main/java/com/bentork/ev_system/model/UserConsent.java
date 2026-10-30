package com.bentork.ev_system.model;

import java.io.Serializable;
import java.time.LocalDateTime;

import com.bentork.ev_system.model.enums.ConsentType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Persists a consent record for DPDPA compliance.
 * Each record is an immutable audit entry — withdrawals are tracked
 * by setting {@code granted = false} and populating {@code withdrawnAt}.
 */
@Entity
@Table(name = "user_consent")
public class UserConsent implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ConsentType consentType;

    @Column(nullable = false)
    private Boolean granted = true;

    /** The exact consent text the user agreed to — immutable snapshot for audit. */
    @Column(length = 2000)
    private String consentText;

    /** IP address at time of consent action (optional audit field). */
    @Column(length = 45)
    private String ipAddress;

    @Column(nullable = false)
    private LocalDateTime grantedAt = LocalDateTime.now();

    /** Populated only when consent is withdrawn. */
    private LocalDateTime withdrawnAt;

    /** Consent policy version (e.g., "1.0") for tracking policy changes. */
    @Column(length = 10)
    private String version = "1.0";

    // === Getters and Setters ===

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

    public ConsentType getConsentType() {
        return consentType;
    }

    public void setConsentType(ConsentType consentType) {
        this.consentType = consentType;
    }

    public Boolean getGranted() {
        return granted;
    }

    public void setGranted(Boolean granted) {
        this.granted = granted;
    }

    public String getConsentText() {
        return consentText;
    }

    public void setConsentText(String consentText) {
        this.consentText = consentText;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public LocalDateTime getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(LocalDateTime grantedAt) {
        this.grantedAt = grantedAt;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }

    public void setWithdrawnAt(LocalDateTime withdrawnAt) {
        this.withdrawnAt = withdrawnAt;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}
