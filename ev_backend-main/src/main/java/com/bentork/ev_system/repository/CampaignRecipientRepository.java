package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CampaignRecipient;

@Repository
public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {

    List<CampaignRecipient> findByCampaignId(Long campaignId);

    List<CampaignRecipient> findByCampaignIdAndSentTrue(Long campaignId);

    List<CampaignRecipient> findByCampaignIdAndRespondedTrue(Long campaignId);

    List<CampaignRecipient> findByCompanyId(Long companyId);

    long countByCampaignId(Long campaignId);

    long countByCampaignIdAndSentTrue(Long campaignId);

    long countByCampaignIdAndOpenedTrue(Long campaignId);

    long countByCampaignIdAndRespondedTrue(Long campaignId);
}
