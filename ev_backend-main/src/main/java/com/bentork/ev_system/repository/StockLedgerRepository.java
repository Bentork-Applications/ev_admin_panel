package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.StockLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockLedgerRepository extends JpaRepository<StockLedger, Long> {

    List<StockLedger> findByProductIdOrderByTransactionDateDesc(Long productId);

    @Query("SELECT COALESCE(SUM(CASE WHEN sl.transactionType = 'IN' THEN sl.quantity ELSE 0 END), 0) - " +
           "COALESCE(SUM(CASE WHEN sl.transactionType = 'OUT' THEN sl.quantity ELSE 0 END), 0) + " +
           "COALESCE(SUM(CASE WHEN sl.transactionType = 'ADJUSTMENT' THEN sl.quantity ELSE 0 END), 0) " +
           "FROM StockLedger sl WHERE sl.product.id = :productId")
    Integer getAvailableStockByProductId(@Param("productId") Long productId);
}
