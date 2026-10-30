package com.bentork.ev_system.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a saved audience segment with filter criteria.
 * 
 * Segments allow sales admins to save and reuse audience filters
 * for campaigns and targeted outreach.
 */
@Entity
@Table(name = "crm_audience_segments", indexes = {
        @Index(name = "idx_audience_segment_name", columnList = "name"),
        @Index(name = "idx_audience_segment_created_by", columnList = "createdByAdminEmail")
})
@Getter
@Setter
public class AudienceSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String filtersJson; // Serialized AudienceFilterDTO as JSON

    private int matchedCount; // Snapshot of how many records matched at save time

    private String createdByAdminEmail;

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
