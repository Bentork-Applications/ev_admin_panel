package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.SalesCompany;

@Repository
public interface SalesCompanyRepository extends JpaRepository<SalesCompany, Long> {

    List<SalesCompany> findByActiveTrueOrderByCreatedAtDesc();

    List<SalesCompany> findByOwnerAdminIdAndActiveTrueOrderByCreatedAtDesc(Long adminId);

    List<SalesCompany> findByNameContainingIgnoreCaseAndActiveTrue(String name);

    List<SalesCompany> findByCityIgnoreCaseAndActiveTrue(String city);

    List<SalesCompany> findByStateIgnoreCaseAndActiveTrue(String state);

    List<SalesCompany> findByIndustryIgnoreCaseAndActiveTrue(String industry);

    Optional<SalesCompany> findByGstNumber(String gstNumber);

    Optional<SalesCompany> findByPhoneAndActiveTrue(String phone);

    long countByActiveTrue();

    long countByOwnerAdminIdAndActiveTrue(Long adminId);
}
