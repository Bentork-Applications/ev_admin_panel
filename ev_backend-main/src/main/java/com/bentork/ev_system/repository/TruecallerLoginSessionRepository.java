package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.TruecallerLoginSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TruecallerLoginSessionRepository extends JpaRepository<TruecallerLoginSession, Long> {
    Optional<TruecallerLoginSession> findByRequestId(String requestId);
    void deleteByCreatedAtBefore(LocalDateTime dateTime);
}
