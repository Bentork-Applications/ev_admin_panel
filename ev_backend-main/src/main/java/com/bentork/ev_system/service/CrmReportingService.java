package com.bentork.ev_system.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.response.LeadConversionReportDTO;
import com.bentork.ev_system.dto.response.RevenueReportDTO;
import com.bentork.ev_system.dto.response.SalesPerformanceDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.OpportunityRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrmReportingService {

    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final AdminRepository adminRepository;

    public LeadConversionReportDTO getLeadConversionReport() {
        long totalLeads = leadRepository.count();
        long qualifiedLeads = leadRepository.countByStatus("qualified");
        long opportunitiesWon = opportunityRepository.countByStage("won");

        LeadConversionReportDTO report = new LeadConversionReportDTO();
        report.setTotalLeads(totalLeads);
        report.setQualifiedLeads(qualifiedLeads);
        
        // Approximation based on those that have a converted opportunity ID
        long converted = leadRepository.findAll().stream()
                .filter(l -> l.getConvertedToOpportunityId() != null)
                .count();
        report.setConvertedToOpportunity(converted);
        
        report.setOpportunitiesWon(opportunitiesWon);
        
        if (totalLeads > 0) {
            report.setConversionRatePercentage(((double) opportunitiesWon / totalLeads) * 100);
        } else {
            report.setConversionRatePercentage(0.0);
        }
        
        return report;
    }

    public RevenueReportDTO getRevenueReport() {
        Double expectedRevenue = opportunityRepository.sumValueByStage("negotiation");
        if (expectedRevenue == null) expectedRevenue = 0.0;
        
        // Add weighted pipeline to expected
        Double pipeline = opportunityRepository.getWeightedPipelineValue();
        if (pipeline != null) expectedRevenue += pipeline;

        Double closedRevenue = opportunityRepository.sumValueByStage("won");
        if (closedRevenue == null) closedRevenue = 0.0;

        RevenueReportDTO report = new RevenueReportDTO();
        report.setPeriod("Overall");
        report.setExpectedRevenue(expectedRevenue);
        report.setClosedRevenue(closedRevenue);

        return report;
    }

    public SalesPerformanceDTO getAdminPerformance(Long adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        long totalLeads = leadRepository.countByOwnerAdminId(adminId);
        long won = opportunityRepository.countByOwnerAdminIdAndStage(adminId, "won");

        double totalRevenue = 0.0;
        var opportunities = opportunityRepository.findByOwnerAdminIdAndStageInOrderByExpectedCloseDateAsc(adminId, List.of("won"));
        for (var opp : opportunities) {
            if (opp.getValue() != null) {
                totalRevenue += opp.getValue();
            }
        }

        SalesPerformanceDTO dto = new SalesPerformanceDTO();
        dto.setAdminId(adminId);
        dto.setAdminName(admin.getName());
        dto.setTotalLeadsHandled(totalLeads);
        dto.setOpportunitiesWon(won);
        dto.setTotalRevenueGenerated(totalRevenue);

        return dto;
    }
}
