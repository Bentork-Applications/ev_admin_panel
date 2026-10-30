package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.RFIDCardApplication;
import com.bentork.ev_system.model.enums.RFIDApplicationStatus;

@Repository
public interface RFIDCardApplicationRepository extends JpaRepository<RFIDCardApplication, Long> {
    List<RFIDCardApplication> findByUserId(Long userId);
    List<RFIDCardApplication> findByStatus(RFIDApplicationStatus status);

    // Delete all RFID card applications by a user (used for account deletion — contains PII)
    void deleteByUserId(Long userId);
}
