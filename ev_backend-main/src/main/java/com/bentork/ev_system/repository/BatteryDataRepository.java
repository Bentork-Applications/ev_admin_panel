package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.BatteryData;

@Repository
public interface BatteryDataRepository extends JpaRepository<BatteryData, Long> {

    List<BatteryData> findByInvoiceNumber(String invoiceNumber);

    Optional<BatteryData> findByBarcode(String barcode);

    List<BatteryData> findAllByOrderByCreatedAtDesc();

    boolean existsByBarcode(String barcode);
}
