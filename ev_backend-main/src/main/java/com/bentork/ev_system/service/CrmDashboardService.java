package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.response.CrmDashboardResponse;
import com.bentork.ev_system.enums.LeadStatus;
import com.bentork.ev_system.enums.OpportunityStage;
import com.bentork.ev_system.repository.ActivityRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.OpportunityRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CrmDashboardService {

    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final ActivityRepository activityRepository;

    public CrmDashboardResponse getDashboardKPIs() {
        CrmDashboardResponse response = new CrmDashboardResponse();

        // Lead KPIs
        response.setTotalLeadsThisMonth(leadRepository.count());
        response.setNewLeads(leadRepository.countByStatus(LeadStatus.NEW.getValue()));
        response.setContactedLeads(leadRepository.countByStatus(LeadStatus.CONTACTED.getValue()));
        response.setQualifiedLeads(leadRepository.countByStatus(LeadStatus.QUALIFIED.getValue()));
        response.setConvertedLeads(leadRepository.countByStatus(LeadStatus.CONVERTED.getValue()));
        response.setLostLeads(leadRepository.countByStatus(LeadStatus.LOST.getValue()));

        // Activity KPIs — today
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        response.setCallsMadeToday(activityRepository.countByActivityTypeAndActivityDateBetween("call", startOfDay, endOfDay));
        response.setMeetingsToday(activityRepository.countByActivityTypeAndActivityDateBetween("meeting", startOfDay, endOfDay));

        // Overdue follow-ups
        long overdueLeads = leadRepository.findByNextFollowUpDateBeforeAndStatusNotIn(
                LocalDate.now(),
                java.util.Arrays.asList(LeadStatus.CONVERTED.getValue(), LeadStatus.LOST.getValue())).size();
        long overdueActivities = activityRepository.findByFollowUpDateBeforeAndFollowUpDateIsNotNull(LocalDate.now()).size();
        response.setOverdueFollowUps(overdueLeads + overdueActivities);

        // Pipeline KPIs
        long activeOpps = opportunityRepository.countByStage(OpportunityStage.QUALIFIED.getValue())
                + opportunityRepository.countByStage(OpportunityStage.REQUIREMENT.getValue())
                + opportunityRepository.countByStage(OpportunityStage.PROPOSAL.getValue())
                + opportunityRepository.countByStage(OpportunityStage.NEGOTIATION.getValue());
        response.setActiveOpportunities(activeOpps);

        Double weightedValue = opportunityRepository.getWeightedPipelineValue();
        response.setWeightedPipelineValue(weightedValue != null ? weightedValue : 0.0);

        Double wonValue = opportunityRepository.sumValueByStage(OpportunityStage.WON.getValue());
        response.setWonValueThisMonth(wonValue != null ? wonValue : 0.0);
        response.setWonDealsThisMonth(opportunityRepository.countByStage(OpportunityStage.WON.getValue()));

        // Total pipeline (sum of all active opportunity values)
        Double qualifiedVal = opportunityRepository.sumValueByStage(OpportunityStage.QUALIFIED.getValue());
        Double reqVal = opportunityRepository.sumValueByStage(OpportunityStage.REQUIREMENT.getValue());
        Double propVal = opportunityRepository.sumValueByStage(OpportunityStage.PROPOSAL.getValue());
        Double negVal = opportunityRepository.sumValueByStage(OpportunityStage.NEGOTIATION.getValue());
        double total = (qualifiedVal != null ? qualifiedVal : 0) + (reqVal != null ? reqVal : 0)
                + (propVal != null ? propVal : 0) + (negVal != null ? negVal : 0);
        response.setTotalPipelineValue(total);

        return response;
    }
}
