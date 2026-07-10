package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Referral;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, Long> {

    Optional<Referral> findByReferredUserId(Long referredUserId);

    List<Referral> findByReferrerId(Long referrerId);

    List<Referral> findByReferrerIdAndStatus(Long referrerId, String status);

    boolean existsByReferredUserId(Long referredUserId);
}
