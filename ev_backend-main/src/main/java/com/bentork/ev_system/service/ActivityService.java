package com.bentork.ev_system.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CompleteActivityDTO;
import com.bentork.ev_system.dto.request.LogActivityDTO;
import com.bentork.ev_system.dto.request.RescheduleActivityDTO;
import com.bentork.ev_system.dto.response.ActivityOverviewStatsDTO;
import com.bentork.ev_system.dto.response.ActivityResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.OpportunityRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final AdminRepository adminRepository;
    private final LeadRepository leadRepository;
    private final SalesCompanyRepository companyRepository;
    private final SalesContactRepository contactRepository;
    private final OpportunityRepository opportunityRepository;

    // ==================== LOG ACTIVITY ====================

    @Transactional
    public ActivityResponse logActivity(LogActivityDTO dto, String adminEmail) {
        Admin admin = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        Activity activity = new Activity();
        activity.setActivityType(dto.getActivityType());
        activity.setCallOutcome(dto.getCallOutcome());
        activity.setSubject(dto.getSubject());
        activity.setNotes(dto.getNotes());
        activity.setDurationMinutes(dto.getDurationMinutes());
        activity.setPerformedByAdmin(admin);

        if (dto.getActivityDate() != null && !dto.getActivityDate().trim().isEmpty()) {
            activity.setActivityDate(LocalDateTime.parse(dto.getActivityDate().trim()));
        } else {
            activity.setActivityDate(LocalDateTime.now());
        }

        if (dto.getFollowUpDate() != null && !dto.getFollowUpDate().trim().isEmpty()) {
            activity.setFollowUpDate(LocalDate.parse(dto.getFollowUpDate().trim()));
        }

        if (dto.getFollowUpTime() != null && !dto.getFollowUpTime().trim().isEmpty()) {
            activity.setFollowUpTime(LocalTime.parse(dto.getFollowUpTime().trim()));
        }

        // Link to related entities
        if (dto.getLeadId() != null) {
            Lead lead = leadRepository.findById(dto.getLeadId())
                    .orElseThrow(() -> new IllegalArgumentException("Lead not found with ID: " + dto.getLeadId()));
            activity.setLead(lead);

            // Auto-populate contact/company from lead if not explicitly provided
            if (dto.getContactId() == null && lead.getContact() != null) {
                activity.setContact(lead.getContact());
            }
            if (dto.getCompanyId() == null && lead.getCompany() != null) {
                activity.setCompany(lead.getCompany());
            }

            // Synchronize lead's next follow-up schedule if one was set
            if (activity.getFollowUpDate() != null) {
                lead.setNextFollowUpDate(activity.getFollowUpDate());
                lead.setNextFollowUpTime(activity.getFollowUpTime());
                leadRepository.save(lead);
                log.info("Lead {} follow-up synced to {} {}", lead.getLeadNumber(), activity.getFollowUpDate(), activity.getFollowUpTime());
            }
        }

        if (dto.getCompanyId() != null && activity.getCompany() == null) {
            activity.setCompany(companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found")));
        }
        if (dto.getContactId() != null && activity.getContact() == null) {
            activity.setContact(contactRepository.findById(dto.getContactId())
                    .orElseThrow(() -> new IllegalArgumentException("Contact not found")));
        }
        if (dto.getOpportunityId() != null) {
            activity.setOpportunity(opportunityRepository.findById(dto.getOpportunityId())
                    .orElseThrow(() -> new IllegalArgumentException("Opportunity not found")));
        }

        Activity saved = activityRepository.save(activity);
        log.info("Activity '{}' logged by {} for lead={}, company={}, opp={}",
                saved.getActivityType(), adminEmail, dto.getLeadId(), dto.getCompanyId(), dto.getOpportunityId());
        return mapToResponse(saved);
    }

    // ==================== OVERVIEW & PAGINATED QUERIES ====================

    /**
     * Paginated and filterable query for all activities across the system.
     */
    public PagedResponse<ActivityResponse> getAllActivitiesPaged(
            String activityType,
            String status,
            String callOutcome,
            Long adminId,
            String startDate,
            String endDate,
            String search,
            int page,
            int size,
            String sortBy,
            String sortDir) {

        Specification<Activity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (activityType != null && !activityType.trim().isEmpty() && !"all".equalsIgnoreCase(activityType)) {
                predicates.add(cb.equal(cb.lower(root.get("activityType")), activityType.toLowerCase().trim()));
            }

            if (status != null && !status.trim().isEmpty() && !"all".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.toLowerCase().trim()));
            }

            if (callOutcome != null && !callOutcome.trim().isEmpty() && !"all".equalsIgnoreCase(callOutcome)) {
                predicates.add(cb.equal(cb.lower(root.get("callOutcome")), callOutcome.toLowerCase().trim()));
            }

            if (adminId != null) {
                predicates.add(cb.equal(root.get("performedByAdmin").get("id"), adminId));
            }

            if (startDate != null && !startDate.trim().isEmpty()) {
                LocalDate start = LocalDate.parse(startDate.trim());
                predicates.add(cb.greaterThanOrEqualTo(root.get("activityDate"), start.atStartOfDay()));
            }

            if (endDate != null && !endDate.trim().isEmpty()) {
                LocalDate end = LocalDate.parse(endDate.trim());
                predicates.add(cb.lessThanOrEqualTo(root.get("activityDate"), end.atTime(LocalTime.MAX)));
            }

            if (search != null && !search.trim().isEmpty()) {
                String term = "%" + search.toLowerCase().trim() + "%";
                Join<Activity, SalesContact> contactJoin = root.join("contact", JoinType.LEFT);
                Join<Activity, SalesCompany> companyJoin = root.join("company", JoinType.LEFT);
                Join<Activity, Lead> leadJoin = root.join("lead", JoinType.LEFT);

                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("subject")), term),
                        cb.like(cb.lower(root.get("notes")), term),
                        cb.like(cb.lower(contactJoin.get("name")), term),
                        cb.like(cb.lower(contactJoin.get("phone")), term),
                        cb.like(cb.lower(companyJoin.get("name")), term),
                        cb.like(cb.lower(leadJoin.get("title")), term),
                        cb.like(cb.lower(leadJoin.get("leadNumber")), term)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        String sortField = (sortBy != null && !sortBy.trim().isEmpty()) ? sortBy.trim() : "activityDate";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Page<Activity> activityPage = activityRepository.findAll(spec, pageable);
        List<ActivityResponse> content = activityPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PagedResponse.of(content, page, size, activityPage.getTotalElements(), activityPage.getTotalPages(), activityPage.isLast());
    }

    /**
     * Dedicated Follow-up schedule retrieval partitioned by bucket:
     * - "overdue": past follow-up date, or today with past time, where status = 'pending'
     * - "today": follow-up date is today and status = 'pending', sorted chronologically by time
     * - "upcoming": follow-up date is after today and status = 'pending'
     * - "completed": follow-ups that have been completed
     * - "all": all activities that have a follow-up date
     */
    public PagedResponse<ActivityResponse> getFollowUpsPaged(String bucket, Long adminId, int page, int size) {
        LocalDate today = LocalDate.now();
        LocalTime nowTime = LocalTime.now();
        Pageable pageable = PageRequest.of(page, size);

        Page<Activity> resultPage;
        String normalizedBucket = (bucket != null) ? bucket.toLowerCase().trim() : "all";

        switch (normalizedBucket) {
            case "overdue":
                resultPage = activityRepository.findOverdueFollowUps(today, nowTime, adminId, pageable);
                break;
            case "today":
                resultPage = activityRepository.findTodayFollowUps(today, adminId, pageable);
                break;
            case "upcoming":
                resultPage = activityRepository.findUpcomingFollowUps(today, adminId, pageable);
                break;
            case "completed":
                resultPage = activityRepository.findCompletedFollowUps(adminId, pageable);
                break;
            case "all":
            default:
                resultPage = activityRepository.findAllFollowUps(adminId, pageable);
                break;
        }

        List<ActivityResponse> content = resultPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PagedResponse.of(content, page, size, resultPage.getTotalElements(), resultPage.getTotalPages(), resultPage.isLast());
    }

    /**
     * Returns top-level summary metrics for the Activities & Follow-up page KPI cards.
     */
    public ActivityOverviewStatsDTO getActivityOverviewStats(Long adminId) {
        LocalDate today = LocalDate.now();
        LocalTime nowTime = LocalTime.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        LocalDateTime startOfWeek = today.with(DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();

        ActivityOverviewStatsDTO stats = new ActivityOverviewStatsDTO();

        // Activity counts
        if (adminId == null) {
            stats.setTotalActivitiesToday(activityRepository.countByActivityDateBetween(startOfDay, endOfDay));
            stats.setTotalActivitiesThisWeek(activityRepository.countByActivityDateBetween(startOfWeek, endOfDay));
            stats.setTotalActivitiesThisMonth(activityRepository.countByActivityDateBetween(startOfMonth, endOfDay));
            stats.setTotalCallsMade(activityRepository.countByActivityType("call"));
            stats.setCallsToday(activityRepository.countByActivityTypeAndActivityDateBetween("call", startOfDay, endOfDay));
            stats.setMeetingsToday(activityRepository.countByActivityTypeAndActivityDateBetween("meeting", startOfDay, endOfDay));
            stats.setTotalPending(activityRepository.countByStatus("pending"));
            stats.setTotalCompleted(activityRepository.countByStatus("completed"));
        } else {
            stats.setTotalActivitiesToday(activityRepository.countByPerformedByAdminIdAndActivityDateBetween(adminId, startOfDay, endOfDay));
            stats.setTotalActivitiesThisWeek(activityRepository.countByPerformedByAdminIdAndActivityDateBetween(adminId, startOfWeek, endOfDay));
            stats.setTotalActivitiesThisMonth(activityRepository.countByPerformedByAdminIdAndActivityDateBetween(adminId, startOfMonth, endOfDay));
            stats.setTotalCallsMade(activityRepository.countByActivityTypeAndPerformedByAdminId("call", adminId));
            stats.setCallsToday(activityRepository.countByActivityTypeAndPerformedByAdminIdAndActivityDateBetween("call", adminId, startOfDay, endOfDay));
            stats.setMeetingsToday(activityRepository.countByActivityTypeAndPerformedByAdminIdAndActivityDateBetween("meeting", adminId, startOfDay, endOfDay));
            stats.setTotalPending(activityRepository.countByStatusAndPerformedByAdminId("pending", adminId));
            stats.setTotalCompleted(activityRepository.countByStatusAndPerformedByAdminId("completed", adminId));
        }

        // Follow-up buckets counts
        stats.setOverdueFollowUps(activityRepository.countOverdueFollowUps(today, nowTime, adminId));
        stats.setTodayFollowUps(activityRepository.countTodayFollowUps(today, adminId));
        stats.setUpcomingFollowUps(activityRepository.countUpcomingFollowUps(today, adminId));
        stats.setCompletedFollowUps(activityRepository.countCompletedFollowUps(adminId));

        // Grouped call outcomes
        Map<String, Long> outcomeMap = new HashMap<>();
        List<Object[]> outcomeResults = activityRepository.countCallsByOutcomeGrouped(adminId);
        for (Object[] row : outcomeResults) {
            if (row[0] != null && row[1] != null) {
                outcomeMap.put(row[0].toString(), ((Number) row[1]).longValue());
            }
        }
        stats.setCallsByOutcome(outcomeMap);

        return stats;
    }

    // ==================== RESCHEDULE & COMPLETION ====================

    /**
     * Reschedule an existing follow-up with a new date and optional time.
     * Updates audit notes and synchronizes with any associated Lead.
     */
    @Transactional
    public ActivityResponse rescheduleActivity(Long activityId, RescheduleActivityDTO dto, String adminEmail) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found with ID: " + activityId));

        if (dto.getNewFollowUpDate() == null || dto.getNewFollowUpDate().trim().isEmpty()) {
            throw new IllegalArgumentException("New follow-up date is required");
        }

        LocalDate newDate = LocalDate.parse(dto.getNewFollowUpDate().trim());
        LocalTime newTime = null;
        if (dto.getNewFollowUpTime() != null && !dto.getNewFollowUpTime().trim().isEmpty()) {
            newTime = LocalTime.parse(dto.getNewFollowUpTime().trim());
        }

        activity.setFollowUpDate(newDate);
        activity.setFollowUpTime(newTime);
        activity.setStatus("pending");
        activity.setCompletedAt(null);

        // Append reschedule reason to notes
        String auditNote = "[Rescheduled on " + LocalDate.now() + " to " + newDate
                + (newTime != null ? " " + newTime : "")
                + (dto.getReason() != null && !dto.getReason().trim().isEmpty() ? " - Reason: " + dto.getReason().trim() : "")
                + " by " + adminEmail + "]";

        activity.setNotes(activity.getNotes() != null && !activity.getNotes().isEmpty()
                ? activity.getNotes() + "\n" + auditNote
                : auditNote);

        Activity saved = activityRepository.save(activity);

        // Synchronize parent lead
        if (saved.getLead() != null) {
            Lead lead = saved.getLead();
            lead.setNextFollowUpDate(newDate);
            lead.setNextFollowUpTime(newTime);
            leadRepository.save(lead);
            log.info("Lead {} next follow-up rescheduled to {} {}", lead.getLeadNumber(), newDate, newTime);
        }

        log.info("Activity {} rescheduled to {} {} by {}", activityId, newDate, newTime, adminEmail);
        return mapToResponse(saved);
    }

    /**
     * Mark an activity as completed with optional resolution notes and outcome.
     */
    @Transactional
    public ActivityResponse completeActivityWithDetails(Long activityId, CompleteActivityDTO dto, String adminEmail) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found with ID: " + activityId));

        if ("completed".equalsIgnoreCase(activity.getStatus())) {
            throw new IllegalArgumentException("Activity is already completed");
        }

        activity.setStatus("completed");
        activity.setCompletedAt(LocalDateTime.now());

        if (dto != null) {
            if (dto.getNotes() != null && !dto.getNotes().trim().isEmpty()) {
                String completionNote = "[Completed: " + dto.getNotes().trim() + "]";
                activity.setNotes(activity.getNotes() != null && !activity.getNotes().isEmpty()
                        ? activity.getNotes() + "\n" + completionNote
                        : completionNote);
            }
            if (dto.getOutcome() != null && !dto.getOutcome().trim().isEmpty()) {
                activity.setCallOutcome(dto.getOutcome().trim());
            }
        }

        Activity saved = activityRepository.save(activity);
        log.info("Activity {} marked as completed by {}", activityId, adminEmail);
        return mapToResponse(saved);
    }

    @Transactional
    public ActivityResponse completeActivity(Long activityId, String adminEmail) {
        return completeActivityWithDetails(activityId, null, adminEmail);
    }

    @Transactional
    public ActivityResponse updateActivityStatus(Long activityId, String newStatus, String adminEmail) {
        Activity activity = activityRepository.findById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found with ID: " + activityId));

        String normalized = newStatus.toLowerCase().trim();
        if (!"pending".equals(normalized) && !"completed".equals(normalized)) {
            throw new IllegalArgumentException("Invalid status: " + newStatus + ". Must be 'pending' or 'completed'");
        }

        activity.setStatus(normalized);
        if ("completed".equals(normalized)) {
            activity.setCompletedAt(LocalDateTime.now());
        } else {
            activity.setCompletedAt(null);
        }

        Activity saved = activityRepository.save(activity);
        log.info("Activity {} status updated to '{}' by {}", activityId, normalized, adminEmail);
        return mapToResponse(saved);
    }

    // ==================== ENTITY-SPECIFIC LOOKUPS ====================

    public List<ActivityResponse> getActivitiesForLead(Long leadId) {
        return activityRepository.findByLeadIdOrderByActivityDateDesc(leadId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<ActivityResponse> getActivitiesForCompany(Long companyId) {
        return activityRepository.findByCompanyIdOrderByActivityDateDesc(companyId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<ActivityResponse> getActivitiesForOpportunity(Long opportunityId) {
        return activityRepository.findByOpportunityIdOrderByActivityDateDesc(opportunityId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<ActivityResponse> getTodayActivities(String adminEmail) {
        Admin admin = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        return activityRepository.findByPerformedByAdminIdAndActivityDateBetweenOrderByActivityDateDesc(
                admin.getId(), startOfDay, endOfDay).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }

    // ==================== HELPERS ====================

    public ActivityResponse mapToResponse(Activity activity) {
        ActivityResponse response = new ActivityResponse();
        response.setId(activity.getId());
        response.setActivityType(activity.getActivityType());
        response.setCallOutcome(activity.getCallOutcome());
        response.setSubject(activity.getSubject());
        response.setNotes(activity.getNotes());
        response.setDurationMinutes(activity.getDurationMinutes());
        response.setFollowUpDate(activity.getFollowUpDate());
        response.setFollowUpTime(activity.getFollowUpTime());
        response.setActivityDate(activity.getActivityDate());
        response.setStatus(activity.getStatus());
        response.setCompletedAt(activity.getCompletedAt());
        response.setCreatedAt(activity.getCreatedAt());

        if (activity.getLead() != null) {
            response.setLeadId(activity.getLead().getId());
            response.setLeadTitle(activity.getLead().getTitle());
            response.setLeadNumber(activity.getLead().getLeadNumber());
        }
        if (activity.getCompany() != null) {
            response.setCompanyId(activity.getCompany().getId());
            response.setCompanyName(activity.getCompany().getName());
        }
        if (activity.getContact() != null) {
            response.setContactId(activity.getContact().getId());
            response.setContactName(activity.getContact().getName());
            response.setContactPhone(activity.getContact().getPhone());
        }
        if (activity.getOpportunity() != null) {
            response.setOpportunityId(activity.getOpportunity().getId());
            response.setOpportunityTitle(activity.getOpportunity().getTitle());
        }

        if (activity.getPerformedByAdmin() != null) {
            response.setPerformedByAdminId(activity.getPerformedByAdmin().getId());
            response.setPerformedByAdminName(activity.getPerformedByAdmin().getName());
        }

        // Computed flag: isOverdue
        boolean isOverdue = false;
        if ("pending".equalsIgnoreCase(activity.getStatus()) && activity.getFollowUpDate() != null) {
            LocalDate today = LocalDate.now();
            if (activity.getFollowUpDate().isBefore(today)) {
                isOverdue = true;
            } else if (activity.getFollowUpDate().isEqual(today)) {
                if (activity.getFollowUpTime() != null) {
                    isOverdue = activity.getFollowUpTime().isBefore(LocalTime.now());
                }
            }
        }
        response.setIsOverdue(isOverdue);

        return response;
    }
}

