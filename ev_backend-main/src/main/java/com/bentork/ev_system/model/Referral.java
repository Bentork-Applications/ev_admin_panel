package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "referrals")
public class Referral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "referrer_id", nullable = false)
    private Long referrerId;

    @Column(name = "referred_user_id", nullable = false)
    private Long referredUserId;

    private String status = "pending"; // pending, completed

    @Column(name = "referrer_bonus_awarded")
    private boolean referrerBonusAwarded = false;

    @Column(name = "referred_bonus_awarded")
    private boolean referredBonusAwarded = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // === Getters and Setters ===

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getReferrerId() {
        return referrerId;
    }

    public void setReferrerId(Long referrerId) {
        this.referrerId = referrerId;
    }

    public Long getReferredUserId() {
        return referredUserId;
    }

    public void setReferredUserId(Long referredUserId) {
        this.referredUserId = referredUserId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isReferrerBonusAwarded() {
        return referrerBonusAwarded;
    }

    public void setReferrerBonusAwarded(boolean referrerBonusAwarded) {
        this.referrerBonusAwarded = referrerBonusAwarded;
    }

    public boolean isReferredBonusAwarded() {
        return referredBonusAwarded;
    }

    public void setReferredBonusAwarded(boolean referredBonusAwarded) {
        this.referredBonusAwarded = referredBonusAwarded;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
}
