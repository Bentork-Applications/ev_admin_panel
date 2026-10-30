package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "crm_automation_rules")
@Getter
@Setter
public class AutomationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String triggerEvent; // e.g., "lead_created", "opportunity_won"

    @Column(nullable = false)
    private String actionType; // e.g., "assign_owner", "send_email", "create_task"

    @Column(columnDefinition = "TEXT")
    private String actionPayload; // JSON string containing rule details

    @Column(nullable = false)
    private boolean isActive = true;

    private Integer delayMinutes; // Delay before executing (e.g., "send follow-up after 30 min")

    private LocalDateTime lastExecutedAt;

    private int executionCount = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
