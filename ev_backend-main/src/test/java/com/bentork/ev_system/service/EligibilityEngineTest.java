package com.bentork.ev_system.service;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.bentork.ev_system.enums.CampaignRoundStatus;
import com.bentork.ev_system.enums.CampaignStatus;
import com.bentork.ev_system.enums.MembershipStatus;
import com.bentork.ev_system.enums.MessageStatus;
import com.bentork.ev_system.model.Campaign;
import com.bentork.ev_system.model.CampaignMembership;
import com.bentork.ev_system.model.CampaignMessage;
import com.bentork.ev_system.model.CampaignRound;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.repository.CampaignMessageRepository;
import com.bentork.ev_system.repository.ContactSuppressionRepository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EligibilityEngineTest {

    @Mock
    private ContactSuppressionRepository suppressionRepository;

    @Mock
    private CampaignMessageRepository messageRepository;

    private EligibilityEngine engine;

    private Campaign activeCampaign;
    private CampaignRound activeRound;
    private Lead activeLead;
    private CampaignMembership activeMembership;

    @BeforeEach
    void setUp() {
        engine = new EligibilityEngine(suppressionRepository, messageRepository);

        activeCampaign = new Campaign();
        activeCampaign.setId(1L);
        activeCampaign.setName("Diwali EV Offer");
        activeCampaign.setStatus(CampaignStatus.ACTIVE.getValue());

        activeRound = new CampaignRound();
        activeRound.setId(10L);
        activeRound.setCampaign(activeCampaign);
        activeRound.setRoundNumber(1);
        activeRound.setStatus(CampaignRoundStatus.IN_PROGRESS.getValue());

        activeLead = new Lead();
        activeLead.setId(100L);
        activeLead.setLeadNumber("LD-20261027-0001");
        activeLead.setPhone("9876543210");
        activeLead.setStatus("new");
        activeLead.setOptedOut(false);

        activeMembership = new CampaignMembership();
        activeMembership.setId(50L);
        activeMembership.setCampaign(activeCampaign);
        activeMembership.setLead(activeLead);
        activeMembership.setPhone("9876543210");
        activeMembership.setEligibilityStatus(MembershipStatus.ELIGIBLE.getValue());
        activeMembership.setHasReplied(false);
    }

    @Test
    void testEligibleLeadPassesAllChecks() {
        when(suppressionRepository.existsByPhoneAndScopeIn(anyString(), anyList())).thenReturn(false);
        when(messageRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertTrue(result.isEligible());
        assertNull(result.getSkipReason());
        assertEquals("919876543210", result.getNormalizedPhone());
    }

    @Test
    void testInactiveCampaignFails() {
        activeCampaign.setStatus(CampaignStatus.PAUSED.getValue());

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertFalse(result.isEligible());
        assertTrue(result.getSkipReason().contains("Campaign is not active"));
    }

    @Test
    void testOptedOutLeadFails() {
        activeLead.setOptedOut(true);

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertFalse(result.isEligible());
        assertTrue(result.getSkipReason().contains("opted out"));
    }

    @Test
    void testRepliedContactPausesMessaging() {
        activeMembership.setHasReplied(true);

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertFalse(result.isEligible());
        assertTrue(result.getSkipReason().contains("replied"));
    }

    @Test
    void testSuppressedContactFails() {
        when(suppressionRepository.existsByPhoneAndScopeIn(anyString(), anyList())).thenReturn(true);

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertFalse(result.isEligible());
        assertTrue(result.getSkipReason().contains("suppression"));
    }

    @Test
    void testAlreadyDeliveredMessageFailsIdempotency() {
        when(suppressionRepository.existsByPhoneAndScopeIn(anyString(), anyList())).thenReturn(false);
        when(messageRepository.existsByIdempotencyKey(anyString())).thenReturn(true);

        CampaignMessage existing = new CampaignMessage();
        existing.setStatus(MessageStatus.DELIVERED.getValue());
        when(messageRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.of(existing));

        EligibilityEngine.EligibilityResult result = engine.checkEligibility(activeCampaign, activeRound, activeMembership);

        assertFalse(result.isEligible());
        assertTrue(result.getSkipReason().contains("already submitted or delivered"));
    }
}
