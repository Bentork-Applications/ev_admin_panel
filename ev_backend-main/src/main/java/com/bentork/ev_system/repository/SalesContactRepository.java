package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.SalesContact;

@Repository
public interface SalesContactRepository extends JpaRepository<SalesContact, Long> {

    Optional<SalesContact> findByPhone(String phone);

    List<SalesContact> findByCompanyIdOrderByIsPrimaryDescNameAsc(Long companyId);

    List<SalesContact> findByPhoneContaining(String phone);

    List<SalesContact> findByNameContainingIgnoreCase(String name);

    boolean existsByPhone(String phone);
}
