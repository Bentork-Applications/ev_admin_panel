package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.LogActivityDTO;
import com.bentork.ev_system.dto.response.ActivityResponse;
import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.OpportunityRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

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

        if (dto.getActivityDate() != null && !dto.getActivityDate().isEmpty()) {
            activity.setActivityDate(LocalDateTime.parse(dto.getActivityDate()));
        } else {
            activity.setActivityDate(LocalDateTime.now());
        }

        if (dto.getFollowUpDate() != null && !dto.getFollowUpDate().isEmpty()) {
            activity.setFollowUpDate(LocalDate.parse(dto.getFollowUpDate()));
        }

        // Link to related entities
        if (dto.getLeadId() != null) {
            activity.setLead(leadRepository.findById(dto.getLeadId())
                    .orElseThrow(() -> new IllegalArgumentException("Lead not found")));
        }
        if (dto.getCompanyId() != null) {
            activity.setCompany(companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found")));
        }
        if (dto.getContactId() != null) {
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
        response.setActivityDate(activity.getActivityDate());
        response.setCreatedAt(activity.getCreatedAt());

        if (activity.getLead() != null) response.setLeadId(activity.getLead().getId());
        if (activity.getCompany() != null) response.setCompanyId(activity.getCompany().getId());
        if (activity.getContact() != null) response.setContactId(activity.getContact().getId());
        if (activity.getOpportunity() != null) response.setOpportunityId(activity.getOpportunity().getId());

        if (activity.getPerformedByAdmin() != null) {
            response.setPerformedByAdminId(activity.getPerformedByAdmin().getId());
            response.setPerformedByAdminName(activity.getPerformedByAdmin().getName());
        }

        return response;
    }
}
