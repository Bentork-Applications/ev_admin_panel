package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.RevenueDTO;
import com.bentork.ev_system.model.Revenue;
import com.bentork.ev_system.model.Session;

import java.math.BigDecimal;
import java.util.List;

/**
 * Interface for revenue query and management operations.
 */
public interface IRevenueService {
    Revenue recordRevenueForSession(Session session, double amount,
                                    String paymentMethod, String transactionId,
                                    String paymentStatus);
    BigDecimal getTotalRevenue();
    BigDecimal getPendingRevenue();
    List<RevenueDTO> getAllRevenue();
    RevenueDTO getById(Long id);
    void delete(Long id);
    Long getTotalTransactions();
    Double getSuccessRate();
}
