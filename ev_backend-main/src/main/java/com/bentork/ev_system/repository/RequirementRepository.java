package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Requirement;

@Repository
public interface RequirementRepository extends JpaRepository<Requirement, Long> {

    List<Requirement> findByLeadIdOrderByCreatedAtDesc(Long leadId);

    List<Requirement> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}
