package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    Optional<PurchaseOrder> findByPoNumber(String poNumber);
    
    java.util.List<PurchaseOrder> findByVendorId(Long vendorId);
}
