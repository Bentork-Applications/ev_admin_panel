package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.WhatsAppTemplate;

@Repository
public interface WhatsAppTemplateRepository extends JpaRepository<WhatsAppTemplate, Long> {

    Optional<WhatsAppTemplate> findByNameAndActiveTrue(String name);

    Optional<WhatsAppTemplate> findByName(String name);

    List<WhatsAppTemplate> findByActiveTrueOrderByCreatedAtDesc();

    List<WhatsAppTemplate> findByApprovalStatusAndActiveTrueOrderByCreatedAtDesc(String approvalStatus);

    List<WhatsAppTemplate> findByApprovalStatusOrderByCreatedAtDesc(String approvalStatus);

    List<WhatsAppTemplate> findByCategoryAndActiveTrueOrderByNameAsc(String category);

    boolean existsByName(String name);
}
