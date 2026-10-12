package com.bentork.ev_system.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Activity;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {

    List<Activity> findByLeadIdOrderByActivityDateDesc(Long leadId);

    List<Activity> findByCompanyIdOrderByActivityDateDesc(Long companyId);

    List<Activity> findByOpportunityIdOrderByActivityDateDesc(Long opportunityId);

    List<Activity> findByContactIdOrderByActivityDateDesc(Long contactId);

    List<Activity> findByPerformedByAdminIdOrderByActivityDateDesc(Long adminId);

    // Today's activities for a specific admin
    List<Activity> findByPerformedByAdminIdAndActivityDateBetweenOrderByActivityDateDesc(
            Long adminId, LocalDateTime start, LocalDateTime end);

    // Overdue follow-ups
    List<Activity> findByFollowUpDateBeforeAndFollowUpDateIsNotNull(LocalDate date);

    List<Activity> findByFollowUpDateAndPerformedByAdminId(LocalDate date, Long adminId);

    // Dashboard counts
    long countByPerformedByAdminIdAndActivityDateBetween(Long adminId, LocalDateTime start, LocalDateTime end);

    long countByActivityTypeAndActivityDateBetween(String activityType, LocalDateTime start, LocalDateTime end);
}
