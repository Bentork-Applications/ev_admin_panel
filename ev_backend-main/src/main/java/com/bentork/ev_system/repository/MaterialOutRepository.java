package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.MaterialOut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MaterialOutRepository extends JpaRepository<MaterialOut, Long> {
    Optional<MaterialOut> findByIssueNumber(String issueNumber);
}
