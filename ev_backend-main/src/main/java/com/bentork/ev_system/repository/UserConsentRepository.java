package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserConsent;
import com.bentork.ev_system.model.enums.ConsentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserConsentRepository extends JpaRepository<UserConsent, Long> {

    /** Find the consent record for a user and specific consent type. */
    Optional<UserConsent> findByUserAndConsentType(User user, ConsentType consentType);

    /** Get all consent records for a user. */
    List<UserConsent> findByUser(User user);

    /** Check if user has an active (granted) consent of the given type. */
    boolean existsByUserAndConsentTypeAndGrantedTrue(User user, ConsentType consentType);

    /** Find active consent record for a user and type. */
    Optional<UserConsent> findByUserAndConsentTypeAndGrantedTrue(User user, ConsentType consentType);

    /** Delete all consent records for a user (used for account deletion). */
    void deleteByUser(User user);
}
