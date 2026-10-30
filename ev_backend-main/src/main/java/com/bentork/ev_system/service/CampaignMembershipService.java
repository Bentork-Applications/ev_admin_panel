package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.response.CampaignMembershipResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.enums.CampaignAuditAction;
import com.bentork.ev_system.enums.MembershipStatus;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.CampaignMembershipRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.util.PhoneNormalizationUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service managing campaign memberships (links between Leads and Campaigns).
 * Enforces BR-01, BR-02, BR-08, FR-06, FR-18, FR-24.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignMembershipService {

    private final CampaignRepository campaignRepository;
    private final CampaignMembershipRepository membershipRepository;
    private final LeadRepository leadRepository;
    private final AdminRepository adminRepository;
    private final CampaignAuditService auditService;

    /**
     * Associates existing CRM leads with a campaign.
     * Prevents duplicate memberships for the same lead and campaign (BR-02).
     */
    @Transactional
    public List<CampaignMembershipResponse> addLeadsToCampaign(Long campaignId, List<Long> leadIds,
                                                               Long targetOwnerAdminId, String adminEmail) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        Admin targetOwner = null;
        if (targetOwnerAdminId != null) {
            targetOwner = adminRepository.findById(targetOwnerAdminId).orElse(null);
        }

        List<Lead> leads = leadRepository.findAllById(leadIds);
        List<CampaignMembership> savedMembers = new ArrayList<>();
        int addedCount = 0;

        for (Lead lead : leads) {
            // Check BR-02: Lead may belong to multiple campaigns, but each lead/campaign relationship must be unique
            if (membershipRepository.existsByCampaignIdAndLeadId(campaignId, lead.getId())) {
                log.info("Lead {} is already a member of campaign {}, skipping duplicate addition", lead.getId(), campaignId);
                continue;
            }

            CampaignMembership membership = new CampaignMembership();
            membership.setCampaign(campaign);
            membership.setLead(lead);

            // Assign owner: targetOwner -> lead.ownerAdmin -> campaign.ownerAdmin
            Admin assignedOwner = targetOwner != null ? targetOwner :
                    (lead.getOwnerAdmin() != null ? lead.getOwnerAdmin() : campaign.getOwnerAdmin());
            membership.setOwnerAdmin(assignedOwner);

            // Denormalize contact info for fast querying
            String contactName = lead.getContact() != null ? lead.getContact().getName() :
                    (lead.getCompany() != null ? lead.getCompany().getName() : lead.getTitle());
            membership.setContactName(contactName);

            String phone = lead.getPhone() != null ? lead.getPhone() :
                    (lead.getContact() != null ? lead.getContact().getPhone() : null);
            membership.setPhone(PhoneNormalizationUtil.normalize(phone));

            membership.setEligibilityStatus(lead.isOptedOut() ? MembershipStatus.OPTED_OUT.getValue() : MembershipStatus.ELIGIBLE.getValue());
            membership.setCurrentRound(0);

            CampaignMembership saved = membershipRepository.save(membership);
            savedMembers.add(saved);
            addedCount++;

            auditService.logMembership(campaignId, saved.getId(), lead.getId(),
                    CampaignAuditAction.LEAD_ADDED.getValue(),
                    "Lead " + lead.getLeadNumber() + " added to campaign", adminEmail);
        }

        // Update campaign total audience
        campaign.setTotalRecipients(campaign.getTotalRecipients() + addedCount);
        campaignRepository.save(campaign);

        log.info("Added {} leads to campaign '{}' (ID: {}) by {}", addedCount, campaign.getName(), campaignId, adminEmail);

        return savedMembers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Pauses messaging for a specific campaign member (BR-08, FR-21).
     */
    @Transactional
    public CampaignMembershipResponse pauseMembership(Long membershipId, String reason, String adminEmail) {
        CampaignMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign membership not found with id: " + membershipId));

        membership.setEligibilityStatus(MembershipStatus.PAUSED.getValue());
        membership.setPauseReason(reason != null ? reason : "MANUAL");
        membership.setPausedAt(LocalDateTime.now());
        membership.setPausedByAdminEmail(adminEmail);

        CampaignMembership updated = membershipRepository.save(membership);

        auditService.logMembership(membership.getCampaign().getId(), membership.getId(), membership.getLead().getId(),
                CampaignAuditAction.LEAD_PAUSED.getValue(), "Paused: " + reason, adminEmail);

        return mapToResponse(updated);
    }

    /**
     * Resumes an individually paused campaign member.
     */
    @Transactional
    public CampaignMembershipResponse resumeMembership(Long membershipId, String adminEmail) {
        CampaignMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign membership not found with id: " + membershipId));

        if (membership.getLead().isOptedOut()) {
            throw new IllegalStateException("Cannot resume contact: Contact has opted out of messaging");
        }

        membership.setEligibilityStatus(MembershipStatus.ELIGIBLE.getValue());
        membership.setPauseReason(null);
        membership.setPausedAt(null);
        membership.setPausedByAdminEmail(null);

        CampaignMembership updated = membershipRepository.save(membership);

        auditService.logMembership(membership.getCampaign().getId(), membership.getId(), membership.getLead().getId(),
                CampaignAuditAction.LEAD_RESUMED.getValue(), "Resumed manually", adminEmail);

        return mapToResponse(updated);
    }

    /**
     * Removes a member from a campaign.
     */
    @Transactional
    public void removeMembership(Long membershipId, String adminEmail) {
        CampaignMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign membership not found with id: " + membershipId));

        Campaign campaign = membership.getCampaign();
        auditService.logMembership(campaign.getId(), membership.getId(), membership.getLead().getId(),
                CampaignAuditAction.LEAD_REMOVED.getValue(), "Removed from campaign", adminEmail);

        membershipRepository.delete(membership);

        if (campaign.getTotalRecipients() > 0) {
            campaign.setTotalRecipients(campaign.getTotalRecipients() - 1);
            campaignRepository.save(campaign);
        }
    }

    /**
     * Get paginated members of a campaign with optional eligibility status filter.
     */
    @Transactional(readOnly = true)
    public PagedResponse<CampaignMembershipResponse> getCampaignMembers(Long campaignId, String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CampaignMembership> memberPage;

        if (status != null && !status.trim().isEmpty()) {
            memberPage = membershipRepository.findByCampaignIdAndEligibilityStatus(campaignId, status.toUpperCase().trim(), pageable);
        } else {
            memberPage = membershipRepository.findByCampaignIdOrderByCreatedAtDesc(campaignId, pageable);
        }

        List<CampaignMembershipResponse> content = memberPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PagedResponse.of(content, page, size, memberPage.getTotalElements(), memberPage.getTotalPages(), memberPage.isLast());
    }

    public CampaignMembershipResponse mapToResponse(CampaignMembership m) {
        Lead lead = m.getLead();
        Campaign campaign = m.getCampaign();

        return CampaignMembershipResponse.builder()
                .id(m.getId())
                .campaignId(campaign != null ? campaign.getId() : null)
                .campaignName(campaign != null ? campaign.getName() : null)
                .leadId(lead != null ? lead.getId() : null)
                .leadNumber(lead != null ? lead.getLeadNumber() : null)
                .contactName(m.getContactName())
                .phone(m.getPhone())
                .companyName(lead != null && lead.getCompany() != null ? lead.getCompany().getName() : null)
                .leadStatus(lead != null ? lead.getStatus() : null)
                .ownerAdminId(m.getOwnerAdmin() != null ? m.getOwnerAdmin().getId() : null)
                .ownerAdminName(m.getOwnerAdmin() != null ? m.getOwnerAdmin().getName() : null)
                .eligibilityStatus(m.getEligibilityStatus())
                .currentRound(m.getCurrentRound())
                .nextDueDate(m.getNextDueDate())
                .pauseReason(m.getPauseReason())
                .pausedAt(m.getPausedAt())
                .pausedByAdminEmail(m.getPausedByAdminEmail())
                .hasReplied(m.isHasReplied())
                .repliedAt(m.getRepliedAt())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
