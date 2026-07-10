package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import com.bentork.ev_system.model.enums.RFIDApplicationStatus;

@Entity
@Table(name = "rfid_card_applications")
public class RFIDCardApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String fullName;
    private String mobile;
    private String email;
    
    @Column(columnDefinition = "TEXT")
    private String address;

    @Enumerated(EnumType.STRING)
    private RFIDApplicationStatus status = RFIDApplicationStatus.PENDING;

    @OneToOne
    @JoinColumn(name = "assigned_card_id")
    private RFIDCard assignedCard;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    // Getters and Setters
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

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public RFIDApplicationStatus getStatus() {
        return status;
    }

    public void setStatus(RFIDApplicationStatus status) {
        this.status = status;
    }

    public RFIDCard getAssignedCard() {
        return assignedCard;
    }

    public void setAssignedCard(RFIDCard assignedCard) {
        this.assignedCard = assignedCard;
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

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
