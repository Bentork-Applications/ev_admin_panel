package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Admin;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    Optional<Admin> findByEmailOrMobile(String email, String mobile);

    boolean existsByEmail(String email);

    Optional<Admin> findByEmail(String email);

    long countAdminByRole(String role);

    Optional<Admin> findByMobile(String mobile);

    // Active-aware queries for soft-delete support
    List<Admin> findByActiveTrue();

    Optional<Admin> findByEmailAndActiveTrue(String email);

    Optional<Admin> findByMobileAndActiveTrue(String mobile);

    long countAdminByRoleAndActiveTrue(String role);
}
