package com.bentork.ev_system.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Opportunity;

@Repository
public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

    Optional<Opportunity> findByOpportunityNumber(String opportunityNumber);

    List<Opportunity> findByStageInOrderByExpectedCloseDateAsc(List<String> stages);

    List<Opportunity> findByOwnerAdminIdAndStageInOrderByExpectedCloseDateAsc(Long adminId, List<String> stages);

    List<Opportunity> findByOwnerAdminIdOrderByCreatedAtDesc(Long adminId);

    List<Opportunity> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    List<Opportunity> findByStageOrderByCreatedAtDesc(String stage);

    List<Opportunity> findAllByOrderByCreatedAtDesc();

    // Dashboard / Pipeline queries
    long countByStage(String stage);

    long countByOwnerAdminIdAndStage(Long adminId, String stage);

    @Query("SELECT SUM(o.value) FROM Opportunity o WHERE o.stage = :stage")
    Double sumValueByStage(@Param("stage") String stage);

    @Query("SELECT SUM(o.value * o.probability / 100.0) FROM Opportunity o WHERE o.stage NOT IN ('won', 'lost')")
    Double getWeightedPipelineValue();
}
