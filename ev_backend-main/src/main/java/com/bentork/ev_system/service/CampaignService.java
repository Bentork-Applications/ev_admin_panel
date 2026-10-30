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

import com.bentork.ev_system.dto.request.AddRecipientsDTO;
import com.bentork.ev_system.dto.request.AudienceFilterDTO;
import com.bentork.ev_system.dto.request.CreateCampaignDTO;
import com.bentork.ev_system.dto.response.AudienceSegmentResponse;
import com.bentork.ev_system.dto.response.CampaignDispatchResultDTO;
import com.bentork.ev_system.dto.response.CampaignRecipientResponse;
import com.bentork.ev_system.dto.response.CampaignResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.model.AudienceSegment;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignRecipient;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.AudienceSegmentRepository;
import com.bentork.ev_system.repository.CampaignRecipientRepository;
import com.bentork.ev_system.repository.CampaignRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final SalesCompanyRepository salesCompanyRepository;
    private final SalesContactRepository salesContactRepository;
    private final AudienceSegmentRepository audienceSegmentRepository;
    private final AudienceService audienceService;
    private final EmailDispatchService emailDispatchService;
    private final WhatsAppDispatchService whatsAppDispatchService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ==================== CRUD & LIFECYCLE ====================

    @Transactional
    public CampaignResponse createCampaign(CreateCampaignDTO dto, String adminEmail) {
        Campaign campaign = new Campaign();
        campaign.setName(dto.getName());
        campaign.setType(dto.getType() != null ? dto.getType() : "OFFER");
        campaign.setChannel(dto.getChannel() != null ? dto.getChannel().toUpperCase().trim() : "EMAIL");
        campaign.setSubject(dto.getSubject());
        campaign.setMessageBody(dto.getMessageBody() != null ? dto.getMessageBody() : dto.getDescription());
        campaign.setDescription(dto.getDescription());
        campaign.setScheduledDate(dto.getScheduledDate());
        campaign.setTargetAudienceSegmentId(dto.getTargetAudienceSegmentId());
        campaign.setCreatedByAdminEmail(adminEmail);
        campaign.setStatus(dto.getScheduledDate() != null ? "SCHEDULED" : "DRAFT");

        Campaign saved = campaignRepository.save(campaign);

        // If target audience segment is specified, auto-populate recipients
        if (dto.getTargetAudienceSegmentId() != null) {
            try {
                addRecipientsFromSegment(saved.getId(), dto.getTargetAudienceSegmentId());
                saved = campaignRepository.findById(saved.getId()).orElse(saved);
            } catch (Exception e) {
                log.warn("Campaign {} created, but failed to auto-attach segment {}: {}",
                        saved.getId(), dto.getTargetAudienceSegmentId(), e.getMessage());
            }
        }

        log.info("Campaign '{}' (ID: {}) created by {} with channel {}", saved.getName(), saved.getId(), adminEmail, saved.getChannel());
        return mapToResponse(saved);
    }

    public List<CampaignResponse> getAllCampaigns() {
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CampaignResponse getCampaignById(Long id) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + id));
        return mapToResponse(campaign);
    }

    @Transactional
    public CampaignResponse updateCampaignStatus(Long id, String status) {
        Campaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + id));

        campaign.setStatus(status.toUpperCase().trim());
        Campaign updated = campaignRepository.save(campaign);
        return mapToResponse(updated);
    }

    // ==================== RECIPIENT MANAGEMENT ====================

    @Transactional
    public CampaignResponse addRecipients(Long campaignId, AddRecipientsDTO dto) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        if (dto.getCompanyIds() != null && !dto.getCompanyIds().isEmpty()) {
            List<SalesCompany> companies = salesCompanyRepository.findAllById(dto.getCompanyIds());
            int addedCount = 0;

            for (SalesCompany company : companies) {
                if (campaignRecipientRepository.existsByCampaignIdAndCompanyId(campaign.getId(), company.getId())) {
                    continue; // Skip duplicate
                }

                // Resolve primary contact
                SalesContact contact = resolvePrimaryContact(company);

                CampaignRecipient recipient = new CampaignRecipient();
                recipient.setCampaign(campaign);
                recipient.setCompany(company);
                recipient.setContact(contact);
                recipient.setRecipientEmail(contact != null && contact.getEmail() != null ? contact.getEmail() : company.getEmail());
                recipient.setRecipientPhone(contact != null && contact.getPhone() != null ? contact.getPhone() : company.getPhone());
                recipient.setDeliveryStatus("PENDING");

                campaignRecipientRepository.save(recipient);
                addedCount++;
            }

            campaign.setTotalRecipients(campaign.getTotalRecipients() + addedCount);
            campaign = campaignRepository.save(campaign);
            log.info("Added {} recipients to Campaign {}", addedCount, campaignId);
        }

        return mapToResponse(campaign);
    }

    /**
     * Attach all matching companies from a saved Audience Segment to this campaign.
     */
    @Transactional
    public CampaignResponse addRecipientsFromSegment(Long campaignId, Long segmentId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        AudienceSegment segment = audienceSegmentRepository.findById(segmentId)
                .orElseThrow(() -> new IllegalArgumentException("Audience segment not found with id: " + segmentId));

        try {
            AudienceFilterDTO filter = objectMapper.readValue(segment.getFiltersJson(), AudienceFilterDTO.class);
            AudienceSegmentResponse audienceResult = audienceService.buildAudience(filter);

            List<Long> companyIds = audienceResult.getMatchedCompanyIds();
            if (companyIds != null && !companyIds.isEmpty()) {
                AddRecipientsDTO dto = new AddRecipientsDTO();
                dto.setCompanyIds(companyIds);
                addRecipients(campaignId, dto);
            }

            campaign.setTargetAudienceSegmentId(segmentId);
            campaign = campaignRepository.save(campaign);
            log.info("Attached audience segment '{}' to Campaign {}, resolving {} companies",
                    segment.getName(), campaignId, companyIds != null ? companyIds.size() : 0);

            return mapToResponse(campaign);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to attach audience segment: " + e.getMessage(), e);
        }
    }

    /**
     * Get paginated list of recipients and their delivery statuses for a campaign.
     */
    public PagedResponse<CampaignRecipientResponse> getCampaignRecipients(Long campaignId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CampaignRecipient> recipientPage = campaignRecipientRepository.findByCampaignId(campaignId, pageable);

        List<CampaignRecipientResponse> content = recipientPage.getContent().stream()
                .map(this::mapRecipientToResponse)
                .collect(Collectors.toList());

        return PagedResponse.of(content, page, size, recipientPage.getTotalElements(), recipientPage.getTotalPages(), recipientPage.isLast());
    }

    // ==================== DISPATCH ENGINE ====================

    /**
     * Execute campaign dispatch to all pending recipients across configured channels (EMAIL, WHATSAPP, or BOTH).
     */
    @Transactional
    public CampaignDispatchResultDTO sendCampaign(Long campaignId, String adminEmail) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found with id: " + campaignId));

        List<CampaignRecipient> recipients = campaignRecipientRepository.findByCampaignId(campaignId);
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("Campaign has no recipients. Add recipients or an audience segment first.");
        }

        String channel = campaign.getChannel() != null ? campaign.getChannel().toUpperCase().trim() : "EMAIL";
        boolean sendEmail = "EMAIL".equals(channel) || "BOTH".equals(channel);
        boolean sendWhatsApp = "WHATSAPP".equals(channel) || "BOTH".equals(channel);

        CampaignDispatchResultDTO result = new CampaignDispatchResultDTO();
        result.setCampaignId(campaign.getId());
        result.setCampaignName(campaign.getName());
        result.setChannel(channel);
        result.setTotalRecipients(recipients.size());
        result.setDispatchedAt(LocalDateTime.now());

        int emailsSent = 0;
        int whatsAppSent = 0;
        int failedCount = 0;

        for (CampaignRecipient recipient : recipients) {
            // Skip already sent recipients
            if (recipient.isSent() && "SENT".equalsIgnoreCase(recipient.getDeliveryStatus())) {
                continue;
            }

            SalesCompany company = recipient.getCompany();
            SalesContact contact = recipient.getContact();

            String contactName = contact != null ? contact.getName() : (company != null ? company.getName() : "Customer");
            String companyName = company != null ? company.getName() : "";
            String email = recipient.getRecipientEmail() != null ? recipient.getRecipientEmail() :
                    (contact != null && contact.getEmail() != null ? contact.getEmail() : (company != null ? company.getEmail() : null));
            String phone = recipient.getRecipientPhone() != null ? recipient.getRecipientPhone() :
                    (contact != null && contact.getPhone() != null ? contact.getPhone() : (company != null ? company.getPhone() : null));

            boolean emailSuccess = false;
            boolean whatsAppSuccess = false;
            List<String> errors = new ArrayList<>();

            // 1. Dispatch Email
            if (sendEmail) {
                if (email != null && !email.trim().isEmpty()) {
                    try {
                        emailDispatchService.sendCampaignEmail(
                                email.trim(),
                                campaign.getSubject(),
                                campaign.getMessageBody(),
                                contactName,
                                companyName);
                        emailSuccess = true;
                        emailsSent++;
                    } catch (Exception e) {
                        errors.add("Email error: " + e.getMessage());
                    }
                } else {
                    errors.add("Email skipped: No email address found");
                }
            }

            // 2. Dispatch WhatsApp
            if (sendWhatsApp) {
                if (phone != null && !phone.trim().isEmpty()) {
                    try {
                        whatsAppDispatchService.sendWhatsAppMessage(
                                phone.trim(),
                                campaign.getMessageBody(),
                                contactName,
                                companyName);
                        whatsAppSuccess = true;
                        whatsAppSent++;
                    } catch (Exception e) {
                        errors.add("WhatsApp error: " + e.getMessage());
                    }
                } else {
                    errors.add("WhatsApp skipped: No phone number found");
                }
            }

            // 3. Update recipient status
            boolean overallSuccess = (sendEmail && emailSuccess) || (sendWhatsApp && whatsAppSuccess);

            if (overallSuccess) {
                recipient.setSent(true);
                recipient.setDeliveryStatus("SENT");
                recipient.setChannelUsed(channel);
                recipient.setSentAt(LocalDateTime.now());
                recipient.setErrorMessage(null);
            } else {
                recipient.setSent(false);
                recipient.setDeliveryStatus("FAILED");
                recipient.setErrorMessage(String.join("; ", errors));
                failedCount++;
                result.getErrors().add("Recipient ID " + recipient.getId() + " (" + contactName + "): " + recipient.getErrorMessage());
            }

            campaignRecipientRepository.save(recipient);
        }

        // 4. Update campaign aggregates
        long totalSent = campaignRecipientRepository.countByCampaignIdAndSentTrue(campaignId);
        campaign.setSentCount((int) totalSent);
        campaign.setStatus("COMPLETED");
        campaignRepository.save(campaign);

        result.setEmailsSent(emailsSent);
        result.setWhatsAppSent(whatsAppSent);
        result.setFailedCount(failedCount);
        result.setStatus(campaign.getStatus());

        log.info("Campaign {} dispatch complete by {}: {} emails, {} WhatsApp sent, {} failed out of {}",
                campaign.getName(), adminEmail, emailsSent, whatsAppSent, failedCount, recipients.size());

        return result;
    }

    // ==================== HELPERS ====================

    private SalesContact resolvePrimaryContact(SalesCompany company) {
        if (company == null) return null;
        List<SalesContact> contacts = salesContactRepository.findByCompanyIdOrderByIsPrimaryDescNameAsc(company.getId());
        return !contacts.isEmpty() ? contacts.get(0) : null;
    }

    public CampaignResponse mapToResponse(Campaign campaign) {
        CampaignResponse response = new CampaignResponse();
        response.setId(campaign.getId());
        response.setName(campaign.getName());
        response.setType(campaign.getType());
        response.setChannel(campaign.getChannel());
        response.setSubject(campaign.getSubject());
        response.setMessageBody(campaign.getMessageBody());
        response.setTargetAudienceSegmentId(campaign.getTargetAudienceSegmentId());
        response.setDescription(campaign.getDescription());
        response.setScheduledDate(campaign.getScheduledDate());
        response.setStatus(campaign.getStatus());
        response.setTotalRecipients(campaign.getTotalRecipients());
        response.setSentCount(campaign.getSentCount());
        response.setOpenedCount(campaign.getOpenedCount());
        response.setRespondedCount(campaign.getRespondedCount());
        response.setCreatedByAdminEmail(campaign.getCreatedByAdminEmail());
        response.setCreatedAt(campaign.getCreatedAt());
        response.setUpdatedAt(campaign.getUpdatedAt());
        return response;
    }

    public CampaignRecipientResponse mapRecipientToResponse(CampaignRecipient r) {
        CampaignRecipientResponse res = new CampaignRecipientResponse();
        res.setId(r.getId());
        res.setCampaignId(r.getCampaign() != null ? r.getCampaign().getId() : null);
        if (r.getCompany() != null) {
            res.setCompanyId(r.getCompany().getId());
            res.setCompanyName(r.getCompany().getName());
        }
        if (r.getContact() != null) {
            res.setContactId(r.getContact().getId());
            res.setContactName(r.getContact().getName());
        }
        res.setRecipientEmail(r.getRecipientEmail());
        res.setRecipientPhone(r.getRecipientPhone());
        res.setChannelUsed(r.getChannelUsed());
        res.setDeliveryStatus(r.getDeliveryStatus());
        res.setSent(r.isSent());
        res.setErrorMessage(r.getErrorMessage());
        res.setSentAt(r.getSentAt());
        res.setOpened(r.isOpened());
        res.setResponded(r.isResponded());
        res.setCreatedAt(r.getCreatedAt());
        return res;
    }
}
