package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.RevenueDTO;
import com.bentork.ev_system.model.Revenue;
import com.bentork.ev_system.model.Session;

public class RevenueMapper {

    public static RevenueDTO toDTO(Revenue revenue) {
        RevenueDTO dto = new RevenueDTO();
        dto.setId(revenue.getId());
        dto.setSessionId(revenue.getSession().getId());
        dto.setUserId(revenue.getUser().getId());
        dto.setChargerId(revenue.getCharger().getId());
        dto.setStationId(revenue.getStation().getId());
        dto.setAmount(revenue.getAmount());
        dto.setPaymentMethod(revenue.getPaymentMethod());
        dto.setTransactionId(revenue.getTransactionId());
        dto.setPaymentStatus(revenue.getPaymentStatus());
        dto.setCreatedAt(revenue.getCreatedAt());
        return dto;
    }

    // helper for internal creation from a session
    public static Revenue fromSession(Session session,
                                      String paymentMethod,
                                      String transactionId,
                                      String paymentStatus,
                                      double amount) {
        Revenue r = new Revenue();
        r.setSession(session);
        r.setUser(session.getUser());
        r.setCharger(session.getCharger());
        // station is explicit in revenue even though charger→station exists
        r.setStation(session.getCharger().getStation());
        r.setAmount(amount);
        r.setPaymentMethod(paymentMethod);
        r.setTransactionId(transactionId);
        r.setPaymentStatus(paymentStatus);
        return r;
    }
}

