package com.bentork.ev_system.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "revenue")
public class Revenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → sessions.id (optional to handle orphan data)
    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private Session session;

    // FK → users.id (optional to handle orphan data)
    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // FK → chargers.id (optional to handle orphan data)
    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "charger_id")
    private Charger charger;

    // FK → stations.id (optional to handle orphan data)
    @ManyToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    // keep double to match project style (Session.cost is double)
    @Column(nullable = false)
    private double amount;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod; // UPI, Wallet, Credit Card, etc.

    @Column(name = "transaction_id", nullable = false, unique = true)
    private String transactionId;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // success / failed / pending

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null)
            createdAt = LocalDateTime.now();
    }

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Session getSession() {
        return session;
    }

    public void setSession(Session session) {
        this.session = session;
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

    public Station getStation() {
        return station;
    }

    public void setStation(Station station) {
        this.station = station;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
