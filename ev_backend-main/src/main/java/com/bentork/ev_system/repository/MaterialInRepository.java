package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.MaterialIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialInRepository extends JpaRepository<MaterialIn, Long> {
    Optional<MaterialIn> findByReceiptNumber(String receiptNumber);
}
