package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.response.CampaignDashboardResponse;
import com.bentork.ev_system.dto.response.WhatsAppCampaignResponse;
import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.enums.CampaignStatus;
import com.bentork.ev_system.enums.MembershipStatus;
import com.bentork.ev_system.enums.MessageStatus;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.CampaignRoundRepository;
import com.bentork.ev_system.repository.ContactSuppressionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for campaign analytics, dashboards, and reporting metrics.
 * Implements FR-25, FR-28, and BRD Section 12 (Reports and Dashboard).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignReportService {

    private final CampaignRepository campaignRepository;
    private final CampaignRoundRepository roundRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final CampaignMessageRepository messageRepository;
    private final ContactSuppressionRepository suppressionRepository;
    private final WhatsAppCampaignService campaignService;

    /**
     * Builds comprehensive campaign dashboard metrics.
     */
    @Transactional(readOnly = true)
    public CampaignDashboardResponse getDashboardMetrics() {
        long totalCampaigns = campaignRepository.count();
        long activeCampaigns = campaignRepository.findByStatusOrderByCreatedAtDesc(CampaignStatus.ACTIVE.getValue()).size();
        long scheduledCampaigns = campaignRepository.findByStatusOrderByCreatedAtDesc(CampaignStatus.SCHEDULED.getValue()).size();
        long completedCampaigns = campaignRepository.findByStatusOrderByCreatedAtDesc(CampaignStatus.COMPLETED.getValue()).size();

        long totalAudience = membershipRepository.count();
        long totalSent = messageRepository.countByRoundIdAndStatusIn(null,
                Arrays.asList(MessageStatus.SUBMITTED.getValue(), MessageStatus.SENT.getValue(),
                        MessageStatus.DELIVERED.getValue(), MessageStatus.READ.getValue()));

        long totalDelivered = messageRepository.countByRoundIdAndStatusIn(null,
                Arrays.asList(MessageStatus.DELIVERED.getValue(), MessageStatus.READ.getValue()));

        long totalRead = messageRepository.countByRoundIdAndStatus(null, MessageStatus.READ.getValue());
        long totalReplies = membershipRepository.countByCampaignIdAndHasRepliedTrue(null);
        long totalConversions = membershipRepository.countByCampaignIdAndEligibilityStatus(null, MembershipStatus.CONVERTED.getValue());
        long totalOptOuts = suppressionRepository.count();

        // Calculate rates safely
        double deliveryRate = totalSent > 0 ? ((double) totalDelivered / totalSent) * 100.0 : 0.0;
        double readRate = totalDelivered > 0 ? ((double) totalRead / totalDelivered) * 100.0 : 0.0;
        double replyRate = totalDelivered > 0 ? ((double) totalReplies / totalDelivered) * 100.0 : 0.0;
        double conversionRate = totalAudience > 0 ? ((double) totalConversions / totalAudience) * 100.0 : 0.0;

        // Round compliance
        LocalDate today = LocalDate.now();
        List<String> finishedStatuses = Arrays.asList(
                CampaignRoundStatus.COMPLETED.getValue(),
                CampaignRoundStatus.CANCELLED.getValue());

        long roundsOverdue = roundRepository.findByPlannedDateBeforeAndStatusNotInOrderByPlannedDateAsc(
                today, finishedStatuses).size();

        long roundsDueNow = roundRepository.findByStatusAndPlannedDateLessThanEqual(
                CampaignRoundStatus.SCHEDULED.getValue(), today).size();

        long roundsDueSoon = roundRepository.findByPlannedDateBetweenAndStatusInOrderByPlannedDateAsc(
                today, today.plusDays(1), List.of(CampaignRoundStatus.SCHEDULED.getValue())).size();

        // Recent campaigns
        List<WhatsAppCampaignResponse> recent = campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(c -> "WHATSAPP".equalsIgnoreCase(c.getChannel()) || "WHATSAPP_OUTREACH".equalsIgnoreCase(c.getType()))
                .limit(5)
                .map(campaignService::mapToResponse)
                .collect(Collectors.toList());

        // Eligibility breakdown
        Map<String, Long> statusBreakdown = new HashMap<>();
        for (MembershipStatus ms : MembershipStatus.values()) {
            statusBreakdown.put(ms.getValue(), membershipRepository.countByCampaignIdAndEligibilityStatus(null, ms.getValue()));
        }

        return CampaignDashboardResponse.builder()
                .totalCampaigns(totalCampaigns)
                .activeCampaigns(activeCampaigns)
                .scheduledCampaigns(scheduledCampaigns)
                .completedCampaigns(completedCampaigns)
                .totalAudience(totalAudience)
                .totalMessagesSent(totalSent)
                .totalMessagesDelivered(totalDelivered)
                .totalMessagesRead(totalRead)
                .totalReplies(totalReplies)
                .totalConversions(totalConversions)
                .totalOptOuts(totalOptOuts)
                .deliveryRate(Math.round(deliveryRate * 10.0) / 10.0)
                .readRate(Math.round(readRate * 10.0) / 10.0)
                .replyRate(Math.round(replyRate * 10.0) / 10.0)
                .conversionRate(Math.round(conversionRate * 10.0) / 10.0)
                .roundsDueSoon(roundsDueSoon)
                .roundsDueNow(roundsDueNow)
                .roundsOverdue(roundsOverdue)
                .recentCampaigns(recent)
                .leadsByEligibilityStatus(statusBreakdown)
                .build();
    }

    /**
     * Builds report for a single campaign.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getCampaignReport(Long campaignId) {
        Campaign campaign = campaignService.getCampaignEntity(campaignId);

        long audienceSize = membershipRepository.countByCampaignId(campaignId);
        long repliedCount = membershipRepository.countByCampaignIdAndHasRepliedTrue(campaignId);
        long convertedCount = membershipRepository.countByCampaignIdAndEligibilityStatus(campaignId, MembershipStatus.CONVERTED.getValue());
        long optedOutCount = membershipRepository.countByCampaignIdAndEligibilityStatus(campaignId, MembershipStatus.OPTED_OUT.getValue());

        Map<String, Object> report = new HashMap<>();
        report.put("campaignId", campaign.getId());
        report.put("campaignName", campaign.getName());
        report.put("objective", campaign.getObjective());
        report.put("status", campaign.getStatus());
        report.put("totalAudience", audienceSize);
        report.put("totalRounds", campaign.getTotalRounds());
        report.put("completedRounds", campaign.getCompletedRounds());
        report.put("messagesSent", campaign.getSentCount());
        report.put("messagesDelivered", campaign.getDeliveredCount());
        report.put("messagesRead", campaign.getReadCount());
        report.put("replies", repliedCount);
        report.put("conversions", convertedCount);
        report.put("optOuts", optedOutCount);
        report.put("failures", campaign.getFailedCount());

        double replyRate = audienceSize > 0 ? ((double) repliedCount / audienceSize) * 100.0 : 0.0;
        double conversionRate = audienceSize > 0 ? ((double) convertedCount / audienceSize) * 100.0 : 0.0;
        report.put("replyRate", Math.round(replyRate * 10.0) / 10.0);
        report.put("conversionRate", Math.round(conversionRate * 10.0) / 10.0);

        return report;
    }
}
