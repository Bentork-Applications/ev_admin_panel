package com.bentork.ev_system.model;

import jakarta.persistence.*;

@Entity
@Table(name = "emergency_contacts")
public class EmergencyContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cpo_phone_number")
    private String cpoPhoneNumber;

    @Column(name = "company_support_number")
    private String companySupportNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCpoPhoneNumber() {
        return cpoPhoneNumber;
    }

    public void setCpoPhoneNumber(String cpoPhoneNumber) {
        this.cpoPhoneNumber = cpoPhoneNumber;
    }

    public String getCompanySupportNumber() {
        return companySupportNumber;
    }

    public void setCompanySupportNumber(String companySupportNumber) {
        this.companySupportNumber = companySupportNumber;
    }

    public Station getStation() {
        return station;
    }

    public void setStation(Station station) {
        this.station = station;
    }
}
