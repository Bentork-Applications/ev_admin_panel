package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.model.Activity;
import com.bentork.ev_system.model.AutomationRule;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.AutomationRuleRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * CRM Automation Engine — Scheduled service that evaluates active automation rules
 * and executes follow-up actions (create tasks, send notifications, assign owners, etc.)
 *
 * Supported trigger events:
 * - "lead_created"       : Fires for new leads created since last execution
 * - "lead_no_activity"   : Fires for leads with no activity in N days
 * - "follow_up_overdue"  : Fires for leads with overdue follow-up dates
 *
 * Supported action types:
 * - "create_task"        : Creates a follow-up activity/task
 * - "assign_owner"       : Re-assigns lead to a specified admin
 * - "update_status"      : Updates lead status
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CrmAutomationExecutionService {

    private final AutomationRuleRepository ruleRepository;
    private final LeadRepository leadRepository;
    private final ActivityRepository activityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Execute all active automation rules. Runs every 30 minutes.
     * Can also be triggered manually via the controller.
     */
    @Scheduled(fixedRate = 1800000) // 30 minutes
    @Transactional
    public Map<String, Object> executeAllActiveRules() {
        List<AutomationRule> activeRules = ruleRepository.findByIsActiveTrue();
        log.info("CRM Automation Engine: Evaluating {} active rules", activeRules.size());

        int totalExecuted = 0;
        int totalActionsCreated = 0;
        Map<String, Object> summary = new HashMap<>();

        for (AutomationRule rule : activeRules) {
            try {
                int actions = executeRule(rule);
                totalActionsCreated += actions;
                if (actions > 0) {
                    totalExecuted++;
                    rule.setLastExecutedAt(LocalDateTime.now());
                    rule.setExecutionCount(rule.getExecutionCount() + 1);
                    ruleRepository.save(rule);
                }
            } catch (Exception e) {
                log.error("Failed to execute automation rule '{}' (ID: {}): {}", rule.getName(), rule.getId(), e.getMessage());
            }
        }

        summary.put("rulesEvaluated", activeRules.size());
        summary.put("rulesTriggered", totalExecuted);
        summary.put("actionsCreated", totalActionsCreated);

        log.info("CRM Automation Engine completed: {} rules evaluated, {} triggered, {} actions created",
                activeRules.size(), totalExecuted, totalActionsCreated);
        return summary;
    }

    /**
     * Execute a single automation rule and return the number of actions taken.
     */
    private int executeRule(AutomationRule rule) {
        switch (rule.getTriggerEvent().toLowerCase()) {
            case "follow_up_overdue":
                return handleFollowUpOverdue(rule);
            case "lead_no_activity":
                return handleLeadNoActivity(rule);
            case "lead_created":
                return handleLeadCreated(rule);
            default:
                log.debug("Unknown trigger event '{}' for rule '{}'", rule.getTriggerEvent(), rule.getName());
                return 0;
        }
    }

    /**
     * Handle "follow_up_overdue" trigger — find leads with overdue follow-ups
     * and create reminder activities.
     */
    private int handleFollowUpOverdue(AutomationRule rule) {
        List<Lead> overdueLeads = leadRepository.findByNextFollowUpDateBeforeAndStatusNotIn(
                LocalDate.now(), List.of("converted", "lost"));

        int actionsCreated = 0;
        for (Lead lead : overdueLeads) {
            try {
                executeAction(rule, lead);
                actionsCreated++;
            } catch (Exception e) {
                log.error("Failed to execute action for lead {}: {}", lead.getLeadNumber(), e.getMessage());
            }
        }
        return actionsCreated;
    }

    /**
     * Handle "lead_no_activity" trigger — find leads that haven't had any activity
     * in the last N days (configured via actionPayload.inactiveDays).
     */
    private int handleLeadNoActivity(AutomationRule rule) {
        int inactiveDays = 7; // Default
        try {
            JsonNode payload = objectMapper.readTree(rule.getActionPayload());
            if (payload.has("inactiveDays")) {
                inactiveDays = payload.get("inactiveDays").asInt(7);
            }
        } catch (Exception ignored) {
        }

        LocalDateTime cutoff = LocalDateTime.now().minusDays(inactiveDays);
        List<Lead> allLeads = leadRepository.findAllByOrderByCreatedAtDesc();

        int actionsCreated = 0;
        for (Lead lead : allLeads) {
            if ("converted".equalsIgnoreCase(lead.getStatus()) || "lost".equalsIgnoreCase(lead.getStatus())) {
                continue;
            }
            // Check if lead has recent activity
            List<Activity> recentActivities = activityRepository.findByLeadIdOrderByActivityDateDesc(lead.getId());
            boolean hasRecentActivity = recentActivities.stream()
                    .anyMatch(a -> a.getActivityDate() != null && a.getActivityDate().isAfter(cutoff));

            if (!hasRecentActivity) {
                try {
                    executeAction(rule, lead);
                    actionsCreated++;
                } catch (Exception e) {
                    log.error("Failed to execute no-activity action for lead {}: {}", lead.getLeadNumber(), e.getMessage());
                }
            }
        }
        return actionsCreated;
    }

    /**
     * Handle "lead_created" trigger — process newly created leads since last execution.
     */
    private int handleLeadCreated(AutomationRule rule) {
        LocalDateTime since = rule.getLastExecutedAt() != null
                ? rule.getLastExecutedAt()
                : LocalDateTime.now().minusHours(1);

        List<Lead> allLeads = leadRepository.findAllByOrderByCreatedAtDesc();
        List<Lead> newLeads = allLeads.stream()
                .filter(l -> l.getCreatedAt() != null && l.getCreatedAt().isAfter(since))
                .toList();

        int actionsCreated = 0;
        for (Lead lead : newLeads) {
            try {
                executeAction(rule, lead);
                actionsCreated++;
            } catch (Exception e) {
                log.error("Failed to execute lead-created action for lead {}: {}", lead.getLeadNumber(), e.getMessage());
            }
        }
        return actionsCreated;
    }

    /**
     * Execute the action defined in the rule for a specific lead.
     */
    private void executeAction(AutomationRule rule, Lead lead) {
        switch (rule.getActionType().toLowerCase()) {
            case "create_task":
                createFollowUpTask(rule, lead);
                break;
            case "update_status":
                updateLeadStatus(rule, lead);
                break;
            default:
                log.debug("Unknown action type '{}' for rule '{}'", rule.getActionType(), rule.getName());
        }
    }

    /**
     * Create a follow-up task/activity for the lead based on rule configuration.
     */
    private void createFollowUpTask(AutomationRule rule, Lead lead) {
        String subject = "Auto: " + rule.getName();
        String notes = rule.getDescription();

        try {
            JsonNode payload = objectMapper.readTree(rule.getActionPayload());
            if (payload.has("subject")) subject = payload.get("subject").asText();
            if (payload.has("notes")) notes = payload.get("notes").asText();
        } catch (Exception ignored) {
        }

        Activity activity = new Activity();
        activity.setLead(lead);
        activity.setCompany(lead.getCompany());
        activity.setContact(lead.getContact());
        activity.setActivityType("task");
        activity.setSubject(subject);
        activity.setNotes(notes + " [Auto-generated by rule: " + rule.getName() + "]");
        activity.setPerformedByAdmin(lead.getOwnerAdmin());
        activity.setActivityDate(LocalDateTime.now());
        activity.setStatus("pending");

        // Set follow-up date and time based on delay
        int delay = (rule.getDelayMinutes() != null && rule.getDelayMinutes() > 0) ? rule.getDelayMinutes() : 1440;
        LocalDateTime targetTime = LocalDateTime.now().plusMinutes(delay);
        activity.setFollowUpDate(targetTime.toLocalDate());
        activity.setFollowUpTime(targetTime.toLocalTime().withSecond(0).withNano(0));

        activityRepository.save(activity);

        // Synchronize parent lead
        lead.setNextFollowUpDate(activity.getFollowUpDate());
        lead.setNextFollowUpTime(activity.getFollowUpTime());
        leadRepository.save(lead);

        log.info("Automation created task '{}' for lead {} (due: {} {}, rule: {})",
                subject, lead.getLeadNumber(), activity.getFollowUpDate(), activity.getFollowUpTime(), rule.getName());
    }

    /**
     * Update lead status based on rule's action payload.
     */
    private void updateLeadStatus(AutomationRule rule, Lead lead) {
        try {
            JsonNode payload = objectMapper.readTree(rule.getActionPayload());
            if (payload.has("targetStatus")) {
                String targetStatus = payload.get("targetStatus").asText();
                lead.setStatus(targetStatus);
                leadRepository.save(lead);
                log.info("Automation updated lead {} status to '{}' (rule: {})",
                        lead.getLeadNumber(), targetStatus, rule.getName());
            }
        } catch (Exception e) {
            log.error("Failed to parse action payload for rule '{}': {}", rule.getName(), e.getMessage());
        }
    }
}
