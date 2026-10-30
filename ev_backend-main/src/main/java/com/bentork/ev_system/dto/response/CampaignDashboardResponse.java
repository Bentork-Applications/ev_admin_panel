package com.bentork.ev_system.dto.response;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignDashboardResponse {

    // Global / Campaign-level high level metrics
    private long totalCampaigns;
    private long activeCampaigns;
    private long scheduledCampaigns;
    private long completedCampaigns;

    // Audience & messaging totals
    private long totalAudience;
    private long totalMessagesSent;
    private long totalMessagesDelivered;
    private long totalMessagesRead;
    private long totalReplies;
    private long totalConversions;
    private long totalOptOuts;

    // Ratios & Performance percentages (calculated)
    private double deliveryRate;   // (delivered / sent) * 100
    private double readRate;       // (read / delivered) * 100
    private double replyRate;      // (replied / delivered) * 100
    private double conversionRate; // (converted / total audience) * 100

    // Round compliance
    private long roundsDueSoon;
    private long roundsDueNow;
    private long roundsOverdue;

    // Per-campaign summary list
    private List<WhatsAppCampaignResponse> recentCampaigns;

    // Distribution metrics (e.g. status breakdown)
    private Map<String, Long> leadsByEligibilityStatus;
}
