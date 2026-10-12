package com.bentork.ev_system.model;

import java.time.LocalDate;
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
 * Represents a sales activity (call, meeting, email, follow-up, note)
 * logged by a sales executive against a lead, company, or opportunity.
 * 
 * Activities form the timeline/audit trail for the CRM.
 */
@Entity
@Table(name = "activities", indexes = {
        @Index(name = "idx_activity_lead", columnList = "lead_id"),
        @Index(name = "idx_activity_company", columnList = "company_id"),
        @Index(name = "idx_activity_opportunity", columnList = "opportunity_id"),
        @Index(name = "idx_activity_type", columnList = "activityType"),
        @Index(name = "idx_activity_follow_up", columnList = "followUpDate"),
        @Index(name = "idx_activity_performed_by", columnList = "performed_by_admin_id"),
        @Index(name = "idx_activity_date", columnList = "activityDate")
})
@Getter
@Setter
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead; // Nullable — activity may be against a company or opportunity directly

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private SalesCompany company; // Nullable

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contact_id")
    private SalesContact contact; // Nullable

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id")
    private Opportunity opportunity; // Nullable

    @Column(nullable = false)
    private String activityType; // ActivityType enum value: "call", "meeting", "email", etc.

    private String callOutcome; // CallOutcome enum value — only relevant when activityType = "call"

    private String subject; // Brief subject line

    @Column(columnDefinition = "TEXT")
    private String notes; // Detailed notes from the interaction

    private Integer durationMinutes; // Call/meeting duration in minutes

    private LocalDate followUpDate; // Scheduled follow-up date (nullable)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_admin_id")
    private Admin performedByAdmin; // The sales exec who performed this activity

    @Column(nullable = false)
    private LocalDateTime activityDate; // When the activity happened

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.activityDate == null) {
            this.activityDate = LocalDateTime.now();
        }
    }
}
