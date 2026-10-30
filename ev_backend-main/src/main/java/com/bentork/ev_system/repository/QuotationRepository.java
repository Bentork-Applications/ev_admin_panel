package com.bentork.ev_system.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Quotation;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {

    Optional<Quotation> findByQuoteNumber(String quoteNumber);

    List<Quotation> findByOpportunityIdOrderByVersionDesc(Long opportunityId);

    List<Quotation> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Quotation> findByStatusOrderByCreatedAtDesc(String status);

    // For expiry job: find SENT quotes past their valid date
    List<Quotation> findByStatusAndValidUntilBefore(String status, LocalDate date);

    List<Quotation> findAllByOrderByCreatedAtDesc();

    // ==================== PAGINATED QUERIES ====================

    Page<Quotation> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Quotation> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}

