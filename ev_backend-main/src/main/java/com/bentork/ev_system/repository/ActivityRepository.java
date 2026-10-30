package com.bentork.ev_system.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Activity;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long>, JpaSpecificationExecutor<Activity> {

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

    long countByActivityTypeAndPerformedByAdminIdAndActivityDateBetween(
            String activityType, Long adminId, LocalDateTime start, LocalDateTime end);

    long countByActivityDateBetween(LocalDateTime start, LocalDateTime end);

    long countByActivityType(String activityType);

    long countByActivityTypeAndPerformedByAdminId(String activityType, Long adminId);

    long countByStatus(String status);

    long countByStatusAndPerformedByAdminId(String status, Long adminId);

    // Status-based queries for activity completion
    List<Activity> findByStatusOrderByActivityDateDesc(String status);

    List<Activity> findByStatusAndPerformedByAdminIdOrderByActivityDateDesc(String status, Long adminId);

    List<Activity> findByFollowUpDateAndStatusOrderByActivityDateAsc(LocalDate followUpDate, String status);

    // ==================== BUCKETED FOLLOW-UP QUERIES ====================

    @Query("SELECT a FROM Activity a WHERE a.status = 'pending' AND a.followUpDate IS NOT NULL AND " +
            "(a.followUpDate < :today OR (a.followUpDate = :today AND a.followUpTime IS NOT NULL AND a.followUpTime < :nowTime)) " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) " +
            "ORDER BY a.followUpDate ASC, a.followUpTime ASC")
    Page<Activity> findOverdueFollowUps(
            @Param("today") LocalDate today,
            @Param("nowTime") LocalTime nowTime,
            @Param("adminId") Long adminId,
            Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.status = 'pending' AND a.followUpDate = :today " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) " +
            "ORDER BY a.followUpTime ASC, a.id ASC")
    Page<Activity> findTodayFollowUps(
            @Param("today") LocalDate today,
            @Param("adminId") Long adminId,
            Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.status = 'pending' AND a.followUpDate > :today " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) " +
            "ORDER BY a.followUpDate ASC, a.followUpTime ASC")
    Page<Activity> findUpcomingFollowUps(
            @Param("today") LocalDate today,
            @Param("adminId") Long adminId,
            Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.status = 'completed' AND a.followUpDate IS NOT NULL " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) " +
            "ORDER BY a.completedAt DESC, a.followUpDate DESC")
    Page<Activity> findCompletedFollowUps(
            @Param("adminId") Long adminId,
            Pageable pageable);

    @Query("SELECT a FROM Activity a WHERE a.followUpDate IS NOT NULL " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) " +
            "ORDER BY a.followUpDate DESC, a.activityDate DESC")
    Page<Activity> findAllFollowUps(
            @Param("adminId") Long adminId,
            Pageable pageable);

    // ==================== STATS COUNTS FOR OVERVIEW CARDS ====================

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.status = 'pending' AND a.followUpDate IS NOT NULL AND " +
            "(a.followUpDate < :today OR (a.followUpDate = :today AND a.followUpTime IS NOT NULL AND a.followUpTime < :nowTime)) " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId)")
    long countOverdueFollowUps(
            @Param("today") LocalDate today,
            @Param("nowTime") LocalTime nowTime,
            @Param("adminId") Long adminId);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.status = 'pending' AND a.followUpDate = :today " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId)")
    long countTodayFollowUps(
            @Param("today") LocalDate today,
            @Param("adminId") Long adminId);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.status = 'pending' AND a.followUpDate > :today " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId)")
    long countUpcomingFollowUps(
            @Param("today") LocalDate today,
            @Param("adminId") Long adminId);

    @Query("SELECT COUNT(a) FROM Activity a WHERE a.status = 'completed' AND a.followUpDate IS NOT NULL " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId)")
    long countCompletedFollowUps(@Param("adminId") Long adminId);

    @Query("SELECT a.callOutcome, COUNT(a) FROM Activity a WHERE a.activityType = 'call' AND a.callOutcome IS NOT NULL " +
            "AND (:adminId IS NULL OR a.performedByAdmin.id = :adminId) GROUP BY a.callOutcome")
    List<Object[]> countCallsByOutcomeGrouped(@Param("adminId") Long adminId);
}
