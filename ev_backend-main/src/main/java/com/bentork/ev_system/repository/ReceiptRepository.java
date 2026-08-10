package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
	Optional<Receipt> findFirstByChargerAndStatusOrderByCreatedAtDesc(Charger charger, String status);

	Optional<Receipt> findBySession(Session session);

	// Find all receipts by user ID (used for account deletion — nullify user FK)
	List<Receipt> findByUserId(Long userId);
}
