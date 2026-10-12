package com.bentork.ev_system.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Lead;

@Repository
public interface LeadRepository extends JpaRepository<Lead, Long> {

    List<Lead> findByOwnerAdminIdOrderByCreatedAtDesc(Long adminId);

    List<Lead> findByStatusOrderByCreatedAtDesc(String status);

    List<Lead> findBySourceOrderByCreatedAtDesc(String source);

    List<Lead> findAllByOrderByCreatedAtDesc();

    Optional<Lead> findByIndiaMartLeadId(String indiaMartLeadId);

    Optional<Lead> findByLeadNumber(String leadNumber);

    List<Lead> findByContactPhoneContaining(String phone);

    List<Lead> findByTitleContainingIgnoreCaseOrNotesContainingIgnoreCase(String title, String notes);

    // Follow-up queries
    List<Lead> findByNextFollowUpDateBetween(LocalDate start, LocalDate end);

    List<Lead> findByNextFollowUpDateBeforeAndStatusNotIn(LocalDate date, List<String> excludedStatuses);

    List<Lead> findByNextFollowUpDateAndOwnerAdminId(LocalDate date, Long adminId);

    // Dashboard queries
    long countByStatus(String status);

    long countBySource(String source);

    long countByOwnerAdminId(Long adminId);

    long countByOwnerAdminIdAndStatus(Long adminId, String status);

    List<Lead> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Lead> findByContactIdOrderByCreatedAtDesc(Long contactId);
}
