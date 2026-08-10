package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.RevenueDTO;
import com.bentork.ev_system.mapper.RevenueMapper;
import com.bentork.ev_system.model.Revenue;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.repository.RevenueRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.bentork.ev_system.service.interfaces.IRevenueService;

@Slf4j
@Service
@Transactional
public class RevenueService implements IRevenueService {

    private final RevenueRepository revenueRepository;

    public RevenueService(RevenueRepository revenueRepository) {
        this.revenueRepository = revenueRepository;
    }

    @Override
    public Revenue recordRevenueForSession(Session session,
            double amount,
            String paymentMethod,
            String transactionId,
            String paymentStatus) {
        try {
            Revenue revenue = RevenueMapper.fromSession(
                    session,
                    paymentMethod,
                    transactionId != null ? transactionId : "TXN-" + UUID.randomUUID(),
                    paymentStatus != null ? paymentStatus : "success",
                    amount);

            Revenue saved = revenueRepository.save(revenue);
            log.info("Revenue recorded: id={}, sessionId={}, amount={}, status={}",
                    saved.getId(), session.getId(), amount, paymentStatus);

            return saved;
        } catch (Exception e) {
            log.error("Failed to record revenue for session: sessionId={}, amount={}: {}",
                    session.getId(), amount, e.getMessage(), e);
            throw e;
        }
    }

    // Calculate Total Revenue
    @Cacheable(value = "dashboard-stats", key = "'total-revenue'")
    public BigDecimal getTotalRevenue() {
        try {
            double total = revenueRepository.sumAmountByPaymentStatus("SUCCESS");
            BigDecimal result = BigDecimal.valueOf(total);
            if (log.isDebugEnabled()) {
                log.debug("Total revenue calculated: {}", result);
            }
            return result;
        } catch (Exception e) {
            log.error("Failed to calculate total revenue: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Pending Revenue (
    @Cacheable(value = "dashboard-stats", key = "'pending-revenue'")
    public BigDecimal getPendingRevenue() {
        try {
            double pending = revenueRepository.sumAmountByPaymentStatus("PENDING");
            BigDecimal result = BigDecimal.valueOf(pending);
            if (log.isDebugEnabled()) {
                log.debug("Pending revenue calculated: {}", result);
            }
            return result;
        } catch (Exception e) {
            log.error("Failed to calculate pending revenue: {}", e.getMessage(), e);
            throw e;
        }
    }

    public List<RevenueDTO> getAllRevenue() {
        try {
            List<RevenueDTO> revenues = revenueRepository.findAll().stream()
                    .map(RevenueMapper::toDTO)
                    .collect(Collectors.toList());

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} revenue records", revenues.size());
            }

            return revenues;
        } catch (Exception e) {
            log.error("Failed to retrieve all revenue: {}", e.getMessage(), e);
            throw e;
        }
    }

    public RevenueDTO getById(Long id) {
        try {
            Revenue r = revenueRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Revenue not found"));

            if (log.isDebugEnabled()) {
                log.debug("Retrieved revenue: id={}, amount={}", id, r.getAmount());
            }

            return RevenueMapper.toDTO(r);
        } catch (RuntimeException e) {
            log.warn("Revenue not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to retrieve revenue: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    public void delete(Long id) {
        try {
            if (!revenueRepository.existsById(id)) {
                throw new RuntimeException("Revenue not found");
            }
            revenueRepository.deleteById(id);
            log.info("Revenue deleted: id={}", id);
        } catch (RuntimeException e) {
            log.warn("Failed to delete revenue - Revenue not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to delete revenue: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // Total Transactions
    @Cacheable(value = "dashboard-stats", key = "'total-transactions'")
    public Long getTotalTransactions() {
        try {
            Long total = revenueRepository.count();

            if (log.isDebugEnabled()) {
                log.debug("Total transactions count: {}", total);
            }

            return total;
        } catch (Exception e) {
            log.error("Failed to get total transactions count: {}", e.getMessage(), e);
            throw e;
        }
    }

    // Success Rate
    @Cacheable(value = "dashboard-stats", key = "'success-rate'")
    public Double getSuccessRate() {
        try {
            long totalTransactions = revenueRepository.count();

            if (totalTransactions == 0) {
                log.warn("No transactions found for success rate calculation");
                return 0.0;
            }

            long successfulTransactions = revenueRepository.countByPaymentStatusIgnoreCase("SUCCESS");

            double successRate = (successfulTransactions * 100.0) / totalTransactions;
            double roundedRate = Math.round(successRate * 100.0) / 100.0;

            log.info("Success rate calculated: {}% (successful={}, total={})",
                    roundedRate, successfulTransactions, totalTransactions);

            return roundedRate;
        } catch (Exception e) {
            log.error("Failed to calculate success rate: {}", e.getMessage(), e);
            throw e;
        }
    }
}