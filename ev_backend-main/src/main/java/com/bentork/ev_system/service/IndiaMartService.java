package com.bentork.ev_system.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.IndiaMartPayloadDTO;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndiaMartService {

    private final LeadRepository leadRepository;
    private final SalesContactRepository salesContactRepository;

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

        // Process Contact
        SalesContact contact = null;
        if (payload.getSenderMobile() != null && !payload.getSenderMobile().isEmpty()) {
            contact = salesContactRepository.findByPhone(payload.getSenderMobile()).orElseGet(() -> {
                SalesContact newContact = new SalesContact();
                newContact.setName(payload.getSenderName() != null ? payload.getSenderName() : "Unknown");
                newContact.setPhone(payload.getSenderMobile());
                newContact.setEmail(payload.getSenderEmail());
                return salesContactRepository.save(newContact);
            });
        }

        // Create Lead
        Lead lead = new Lead();
        lead.setLeadNumber("IM-" + System.currentTimeMillis() + "-" + payload.getUniqueQueryId());
        lead.setTitle(payload.getQueryProductName() != null ? payload.getQueryProductName() : "IndiaMART Enquiry");
        lead.setSource("IndiaMART");
        lead.setStatus("new");
        lead.setCity(payload.getSenderCity());
        lead.setState(payload.getSenderState());
        
        String notes = "Company: " + payload.getSenderCompany() + "\n" +
                       "Message: " + payload.getQueryMessage();
        lead.setNotes(notes);
        lead.setIndiaMartLeadId(payload.getUniqueQueryId());
        lead.setContact(contact);

        leadRepository.save(lead);
        log.info("Successfully saved IndiaMART lead {}", payload.getUniqueQueryId());
    }
}
