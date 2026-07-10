package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.RFIDCardRequest;
import com.bentork.ev_system.model.RFIDCard;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.RFIDCardRepository;
import com.bentork.ev_system.repository.UserRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class RFIDCardService {

    private final RFIDCardRepository cardRepo;
    private final UserRepository userRepo;

    // Register new RFID card
    @CacheEvict(value = "rfid-stats", allEntries = true)
    public RFIDCard registerCard(RFIDCardRequest req) {
        try {
            User user = userRepo.findById(req.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            RFIDCard card = new RFIDCard();
            card.setCardNumber(req.getCardNumber());
            card.setUser(user);
            card.setActive(true);

            RFIDCard saved = cardRepo.save(card);
            log.info("RFID card registered: id={}, cardNumber={}, userId={}",
                    saved.getId(), saved.getCardNumber(), user.getId());

            return saved;
        } catch (RuntimeException e) {
            log.error("Failed to register RFID card - User not found: userId={}", req.getUserId());
            throw e;
        } catch (Exception e) {
            log.error("Failed to register RFID card: cardNumber={}, userId={}: {}",
                    req.getCardNumber(), req.getUserId(), e.getMessage(), e);
            throw e;
        }
    }

    // Get all cards
    @Cacheable(value = "rfid-stats", key = "'all-cards'")
    public List<RFIDCard> getAllCards() {
        try {
            List<RFIDCard> cards = cardRepo.findAll();

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} RFID cards", cards.size());
            }

            return cards;
        } catch (Exception e) {
            log.error("Failed to retrieve all RFID cards: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Get card by ID
    public RFIDCard getCard(Long id) {
        try {
            RFIDCard card = cardRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Card not found"));

            if (log.isDebugEnabled()) {
                log.debug("Retrieved RFID card: id={}, cardNumber={}", id, card.getCardNumber());
            }

            return card;
        } catch (RuntimeException e) {
            log.warn("RFID card not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to retrieve RFID card: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // Update card status (activate/deactivate)
    @CacheEvict(value = "rfid-stats", allEntries = true)
    public RFIDCard updateCardStatus(Long id, boolean active) {
        try {
            RFIDCard card = getCard(id);
            boolean oldStatus = card.isActive();
            card.setActive(active);

            RFIDCard updated = cardRepo.save(card);
            log.info("RFID card status updated: id={}, cardNumber={}, status changed from {} to {}",
                    id, card.getCardNumber(), oldStatus, active);

            return updated;
        } catch (Exception e) {
            log.error("Failed to update RFID card status: id={}, active={}: {}",
                    id, active, e.getMessage(), e);
            throw e;
        }
    }

    // Delete card
    @CacheEvict(value = "rfid-stats", allEntries = true)
    public void deleteCard(Long id) {
        try {
            cardRepo.deleteById(id);
            log.info("RFID card deleted: id={}", id);
        } catch (Exception e) {
            log.error("Failed to delete RFID card: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // Total Cards
    @Cacheable(value = "rfid-stats", key = "'total-cards'")
    public Long getTotalCards() {
        try {
            Long total = cardRepo.count();

            if (log.isDebugEnabled()) {
                log.debug("Total RFID cards count: {}", total);
            }

            return total;
        } catch (Exception e) {
            log.error("Failed to get total RFID cards count: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Active Cards
    @Cacheable(value = "rfid-stats", key = "'active-cards'")
    public Long getActiveCards() {
        try {
            Long activeCount = cardRepo.countByActiveTrue();
            if (log.isDebugEnabled()) {
                log.debug("Active RFID cards count: {}", activeCount);
            }
            return activeCount;
        } catch (Exception e) {
            log.error("Failed to get active RFID cards count: {}", e.getMessage(), e);
            throw e;
        }
    }

    @Cacheable(value = "rfid-stats", key = "'inactive-cards'")
    public Long getInactiveCards() {
        try {
            Long inactiveCount = cardRepo.countByActiveFalse();
            if (log.isDebugEnabled()) {
                log.debug("Inactive RFID cards count: {}", inactiveCount);
            }
            return inactiveCount;
        } catch (Exception e) {
            log.error("Failed to get inactive RFID cards count: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Recently Added - Last 7 days
    @Cacheable(value = "rfid-stats", key = "'recently-added'")
    public Long getRecentlyAddedCards() {
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            Long recentCount = cardRepo.countByCreatedAtAfter(sevenDaysAgo);
            if (log.isDebugEnabled()) {
                log.debug("Recently added RFID cards (last 7 days): {}", recentCount);
            }
            return recentCount;
        } catch (Exception e) {
            log.error("Failed to get recently added RFID cards count: {}", e.getMessage(), e);
            throw e;
        }
    }
}