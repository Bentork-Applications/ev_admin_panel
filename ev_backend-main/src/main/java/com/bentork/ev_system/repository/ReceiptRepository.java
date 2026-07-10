package com.bentork.ev_system.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
	Optional<Receipt> findFirstByChargerAndStatusOrderByCreatedAtDesc(Charger charger, String status);

	Optional<Receipt> findBySession(Session session);

}
