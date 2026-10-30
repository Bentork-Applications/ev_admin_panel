package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CampaignMembership;

@Repository
public interface CampaignMembershipRepository extends JpaRepository<CampaignMembership, Long> {

    // Paginated listing of campaign members
    Page<CampaignMembership> findByCampaignIdOrderByCreatedAtDesc(Long campaignId, Pageable pageable);

    List<CampaignMembership> findByCampaignId(Long campaignId);

    // Filter by eligibility status
    List<CampaignMembership> findByCampaignIdAndEligibilityStatus(Long campaignId, String eligibilityStatus);

    Page<CampaignMembership> findByCampaignIdAndEligibilityStatus(
            Long campaignId, String eligibilityStatus, Pageable pageable);

    // Dedup check (BR-02): unique lead/campaign relationship
    boolean existsByCampaignIdAndLeadId(Long campaignId, Long leadId);

    Optional<CampaignMembership> findByCampaignIdAndLeadId(Long campaignId, Long leadId);

    // Find all campaigns a lead belongs to
    List<CampaignMembership> findByLeadId(Long leadId);

    List<CampaignMembership> findByLeadIdAndEligibilityStatus(Long leadId, String eligibilityStatus);

    // Find by phone for webhook reply matching
    List<CampaignMembership> findByPhoneAndEligibilityStatus(String phone, String eligibilityStatus);

    // Find eligible members for a round
    @Query("SELECT cm FROM CampaignMembership cm WHERE cm.campaign.id = :campaignId " +
            "AND cm.eligibilityStatus = 'ELIGIBLE' " +
            "AND (cm.currentRound IS NULL OR cm.currentRound < :roundNumber)")
    List<CampaignMembership> findEligibleForRound(
            @Param("campaignId") Long campaignId,
            @Param("roundNumber") Integer roundNumber);

    // Count by status
    long countByCampaignId(Long campaignId);

    long countByCampaignIdAndEligibilityStatus(Long campaignId, String eligibilityStatus);

    long countByCampaignIdAndHasRepliedTrue(Long campaignId);

    // Owner-based queries for sales exec workload
    List<CampaignMembership> findByOwnerAdminIdAndEligibilityStatus(Long adminId, String eligibilityStatus);

    long countByOwnerAdminId(Long adminId);

    long countByOwnerAdminIdAndEligibilityStatus(Long adminId, String eligibilityStatus);
}
