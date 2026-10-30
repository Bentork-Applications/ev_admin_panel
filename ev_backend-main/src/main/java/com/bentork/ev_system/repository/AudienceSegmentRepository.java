package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.AudienceSegment;

@Repository
public interface AudienceSegmentRepository extends JpaRepository<AudienceSegment, Long> {

    List<AudienceSegment> findAllByOrderByCreatedAtDesc();

    List<AudienceSegment> findByCreatedByAdminEmailOrderByCreatedAtDesc(String email);

    List<AudienceSegment> findByNameContainingIgnoreCase(String name);
}
