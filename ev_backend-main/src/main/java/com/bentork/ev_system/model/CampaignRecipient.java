package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a recipient of a {@link Campaign}.
 * 
 * Tracks whether the campaign was sent, opened, and responded to
 * by a specific {@link SalesContact} at a {@link SalesCompany}.
 */
@Entity
@Table(name = "campaign_recipients", indexes = {
        @Index(name = "idx_campaign_recipient_campaign", columnList = "campaign_id"),
        @Index(name = "idx_campaign_recipient_company", columnList = "company_id"),
        @Index(name = "idx_campaign_recipient_contact", columnList = "contact_id")
})
@Getter
@Setter
public class CampaignRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private SalesCompany company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private SalesContact contact;

    @Column(nullable = false)
    private boolean sent = false;

    private boolean opened = false;

    private boolean responded = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
