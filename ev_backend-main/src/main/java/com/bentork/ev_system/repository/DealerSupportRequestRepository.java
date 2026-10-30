package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.DealerSupportRequest;

@Repository
public interface DealerSupportRequestRepository extends JpaRepository<DealerSupportRequest, Long> {

    List<DealerSupportRequest> findBySubmitterEmailOrderByCreatedAtDesc(String email);

    List<DealerSupportRequest> findAllByOrderByCreatedAtDesc();

    List<DealerSupportRequest> findByStatusOrderByCreatedAtDesc(String status);
}
