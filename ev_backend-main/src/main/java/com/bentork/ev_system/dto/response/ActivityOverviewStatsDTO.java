package com.bentork.ev_system.dto.response;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary metrics for the CRM Activities & Follow-ups Overview page KPI cards.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityOverviewStatsDTO {

    // Activity volume counts
    private long totalActivitiesToday;
    private long totalActivitiesThisWeek;
    private long totalActivitiesThisMonth;

    // Calls metrics
    private long totalCallsMade;
    private long callsToday;
    private Map<String, Long> callsByOutcome; // e.g., {"interested": 10, "call_back": 5, ...}

    // Meetings metrics
    private long meetingsToday;
    private long upcomingMeetings;

    // Follow-ups breakdown
    private long overdueFollowUps;
    private long todayFollowUps;
    private long upcomingFollowUps;
    private long completedFollowUps;

    // Status breakdown
    private long totalPending;
    private long totalCompleted;
}
