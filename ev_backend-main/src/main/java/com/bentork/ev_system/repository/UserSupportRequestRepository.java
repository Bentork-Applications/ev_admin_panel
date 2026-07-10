package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.UserSupportRequest;

@Repository
public interface UserSupportRequestRepository extends JpaRepository<UserSupportRequest, Long> {

    List<UserSupportRequest> findBySubmitterEmailOrderByCreatedAtDesc(String email);

    List<UserSupportRequest> findAllByOrderByCreatedAtDesc();

    List<UserSupportRequest> findByStatusOrderByCreatedAtDesc(String status);
}
