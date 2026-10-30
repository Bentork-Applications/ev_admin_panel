package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.ContactSuppression;

@Repository
public interface ContactSuppressionRepository extends JpaRepository<ContactSuppression, Long> {

    // Check if a phone is globally suppressed
    boolean existsByPhoneAndScope(String phone, String scope);

    // Check if a phone is suppressed for any scope
    boolean existsByPhone(String phone);

    // Find all suppression records for a phone
    List<ContactSuppression> findByPhoneOrderByCreatedAtDesc(String phone);

    // Find suppression by lead
    List<ContactSuppression> findByLeadIdOrderByCreatedAtDesc(Long leadId);

    Optional<ContactSuppression> findByLeadId(Long leadId);

    // Find by scope (GLOBAL or campaign-specific)
    List<ContactSuppression> findByScopeOrderByCreatedAtDesc(String scope);

    // Find by reason
    List<ContactSuppression> findByReasonOrderByCreatedAtDesc(String reason);

    // Check if phone is suppressed globally or for a specific campaign
    boolean existsByPhoneAndScopeIn(String phone, List<String> scopes);
}
