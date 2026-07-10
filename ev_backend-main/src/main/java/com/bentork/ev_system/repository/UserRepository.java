package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailOrMobile(String email, String mobile);

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    Optional<User> findByMobile(String mobile);

    Optional<User> findByReferralCode(String referralCode);

    boolean existsByReferralCode(String referralCode);

    // Active-aware queries for soft-delete support
    List<User> findByActiveTrue();

    long countByActiveTrue();

    Optional<User> findByEmailAndActiveTrue(String email);

    Optional<User> findByMobileAndActiveTrue(String mobile);

    /**
     * Find user by ID with PESSIMISTIC_WRITE lock.
     * This prevents race conditions during wallet balance updates.
     * The lock is held until the transaction commits/rollbacks.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithLock(@Param("id") Long id);
}
