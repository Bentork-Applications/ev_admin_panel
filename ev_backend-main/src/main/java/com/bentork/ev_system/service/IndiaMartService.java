package com.bentork.ev_system.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.bentork.ev_system.dto.request.IndiaMartPayloadDTO;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;
import com.bentork.ev_system.repository.SalesContactRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndiaMartService {

    private final LeadRepository leadRepository;
    private final SalesContactRepository salesContactRepository;
    private final SalesCompanyRepository salesCompanyRepository;
    private final AdminRepository adminRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${INDIAMART_CRM_KEY:}")
    private String indiaMartCrmKey;

    @Transactional
    public void processWebhookPayload(IndiaMartPayloadDTO payload) {
        log.info("Received IndiaMART lead: {}", payload.getUniqueQueryId());

        if (payload.getUniqueQueryId() == null) {
            log.warn("Ignoring IndiaMART payload without UNIQUE_QUERY_ID");
            return;
        }

        // Deduplication
        Optional<Lead> existingLead = leadRepository.findByIndiaMartLeadId(payload.getUniqueQueryId());
        if (existingLead.isPresent()) {
            log.info("Lead {} already exists in the system. Ignoring.", payload.getUniqueQueryId());
            return;
        }

        // 1. Get default sales owner
        Admin defaultOwner = adminRepository.findByActiveTrue().stream()
                .filter(a -> "SALES_ADMIN".equals(a.getRole()) || "ADMIN".equals(a.getRole()))
                .findFirst()
                .orElse(null);

        // 2. Process Company
        SalesCompany company = null;
        if (payload.getSenderCompany() != null && !payload.getSenderCompany().isEmpty()) {
            String companyName = payload.getSenderCompany();
            // Try to find existing company by name, take the first one if multiple exist
            List<SalesCompany> existingCompanies = salesCompanyRepository.findByNameContainingIgnoreCaseAndActiveTrue(companyName);
            if (!existingCompanies.isEmpty()) {
                company = existingCompanies.get(0);
            } else {
                SalesCompany newCompany = new SalesCompany();
                newCompany.setName(companyName);
                newCompany.setCity(payload.getSenderCity());
                newCompany.setState(payload.getSenderState());
                newCompany.setSource("IndiaMART");
                newCompany.setOwnerAdmin(defaultOwner);
                company = salesCompanyRepository.save(newCompany);
                log.info("Created new company from IndiaMART: {}", companyName);
            }
        }

        // 3. Process Contact
        SalesContact contact = null;
        if (payload.getSenderMobile() != null && !payload.getSenderMobile().isEmpty()) {
            final SalesCompany finalCompany = company; // effectively final for lambda
            contact = salesContactRepository.findByPhone(payload.getSenderMobile()).orElseGet(() -> {
                SalesContact newContact = new SalesContact();
                newContact.setName(payload.getSenderName() != null ? payload.getSenderName() : "Unknown");
                newContact.setPhone(payload.getSenderMobile());
                newContact.setEmail(payload.getSenderEmail());
                newContact.setCompany(finalCompany);
                newContact.setPrimary(true);
                return salesContactRepository.save(newContact);
            });
            // Update contact's company if it was null
            if (contact.getCompany() == null && company != null) {
                contact.setCompany(company);
                salesContactRepository.save(contact);
            }
        }

        // 4. Create Lead
        Lead lead = new Lead();
        lead.setLeadNumber("IM-" + System.currentTimeMillis() + "-" + payload.getUniqueQueryId());
        lead.setTitle(payload.getQueryProductName() != null ? payload.getQueryProductName() : "IndiaMART Enquiry");
        lead.setSource("IndiaMART");
        lead.setStatus("new");
        lead.setCity(payload.getSenderCity());
        lead.setState(payload.getSenderState());
        lead.setOwnerAdmin(defaultOwner);
        lead.setCompany(company);
        lead.setContact(contact);
        
        String notes = "Message: " + payload.getQueryMessage();
        lead.setNotes(notes);
        lead.setIndiaMartLeadId(payload.getUniqueQueryId());

        leadRepository.save(lead);
        log.info("Successfully saved IndiaMART lead {} with company {}", 
            payload.getUniqueQueryId(), company != null ? company.getName() : "None");
    }

    /**
     * Poll IndiaMART API for new leads and process them.
     * @return number of new leads processed
     */
    public int syncLeads() {
        if (indiaMartCrmKey == null || indiaMartCrmKey.isEmpty() || indiaMartCrmKey.equals("your_api_key_here")) {
            log.warn("IndiaMART CRM key is not configured. Skipping sync.");
            return 0;
        }

        try {
            // According to IndiaMART API docs, this is the standard endpoint for pulling leads
            String url = "https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=" + indiaMartCrmKey;
            
            // Example response parsing - this depends on the exact structure returned by IndiaMART
            // They usually return a JSON with a "RESPONSE" array containing leads
            String responseStr = restTemplate.getForObject(url, String.class);
            if (responseStr == null) return 0;
            
            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode responseArray = root.path("RESPONSE");
            
            int processedCount = 0;
            if (responseArray.isArray()) {
                for (JsonNode node : responseArray) {
                    try {
                        IndiaMartPayloadDTO dto = new IndiaMartPayloadDTO();
                        dto.setUniqueQueryId(node.path("UNIQUE_QUERY_ID").asText(null));
                        dto.setSenderName(node.path("SENDER_NAME").asText(null));
                        dto.setSenderMobile(node.path("SENDER_MOBILE").asText(null));
                        dto.setSenderEmail(node.path("SENDER_EMAIL").asText(null));
                        dto.setSenderCompany(node.path("SENDER_COMPANY").asText(null));
                        dto.setSenderCity(node.path("SENDER_CITY").asText(null));
                        dto.setSenderState(node.path("SENDER_STATE").asText(null));
                        dto.setQueryProductName(node.path("QUERY_PRODUCT_NAME").asText(null));
                        dto.setQueryMessage(node.path("QUERY_MESSAGE").asText(null));
                        
                        // We check uniqueness inside processWebhookPayload
                        if (dto.getUniqueQueryId() != null) {
                            processWebhookPayload(dto);
                            processedCount++;
                        }
                    } catch (Exception e) {
                        log.error("Error processing individual lead from IndiaMART API sync", e);
                    }
                }
            }
            log.info("IndiaMART sync completed. Processed {} leads.", processedCount);
            return processedCount;
            
        } catch (Exception e) {
            log.error("Failed to sync leads from IndiaMART API", e);
            return 0;
        }
    }
}
