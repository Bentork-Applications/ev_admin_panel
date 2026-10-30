package com.bentork.ev_system.service;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.SalesContactRepository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DuplicateMatchingServiceTest {

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private SalesContactRepository salesContactRepository;

    private DuplicateMatchingService matchingService;

    @BeforeEach
    void setUp() {
        matchingService = new DuplicateMatchingService(leadRepository, salesContactRepository);
    }

    @Test
    void testMatchByDirectLeadPhone() {
        Lead lead = new Lead();
        lead.setId(101L);
        lead.setLeadNumber("LD-101");
        lead.setPhone("919876543210");

        when(leadRepository.findFirstByPhoneOrderByCreatedAtDesc("919876543210"))
                .thenReturn(Optional.of(lead));

        DuplicateMatchingService.MatchResult result = matchingService.matchByPhone("9876543210");

        assertTrue(result.isMatched());
        assertEquals("DIRECT_LEAD_PHONE", result.getMatchType());
        assertNotNull(result.getMatchedLead());
        assertEquals(101L, result.getMatchedLead().getId());
    }

    @Test
    void testMatchByContactPhone() {
        Lead lead = new Lead();
        lead.setId(202L);
        SalesContact contact = new SalesContact();
        contact.setId(505L);
        contact.setPhone("919876543210");
        lead.setContact(contact);

        when(leadRepository.findFirstByPhoneOrderByCreatedAtDesc("919876543210"))
                .thenReturn(Optional.empty());
        when(leadRepository.findFirstByPhoneOrderByCreatedAtDesc("9876543210"))
                .thenReturn(Optional.empty());
        when(leadRepository.findFirstByContactPhoneOrderByCreatedAtDesc("919876543210"))
                .thenReturn(Optional.of(lead));

        DuplicateMatchingService.MatchResult result = matchingService.matchByPhone("9876543210");

        assertTrue(result.isMatched());
        assertEquals("CONTACT_PHONE", result.getMatchType());
        assertEquals(202L, result.getMatchedLead().getId());
    }

    @Test
    void testNoMatchReturnsFalse() {
        when(leadRepository.findFirstByPhoneOrderByCreatedAtDesc("919876543210")).thenReturn(Optional.empty());
        when(leadRepository.findFirstByPhoneOrderByCreatedAtDesc("9876543210")).thenReturn(Optional.empty());
        when(leadRepository.findFirstByContactPhoneOrderByCreatedAtDesc("919876543210")).thenReturn(Optional.empty());
        when(leadRepository.findFirstByContactPhoneOrderByCreatedAtDesc("9876543210")).thenReturn(Optional.empty());
        when(salesContactRepository.findByPhone("919876543210")).thenReturn(Optional.empty());

        DuplicateMatchingService.MatchResult result = matchingService.matchByPhone("9876543210");

        assertFalse(result.isMatched());
        assertEquals("NONE", result.getMatchType());
        assertNull(result.getMatchedLead());
    }
}
