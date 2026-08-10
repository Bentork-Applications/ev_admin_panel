package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.PlanDTO;
import com.bentork.ev_system.dto.request.UserPlanSelectionDTO;
import com.bentork.ev_system.mapper.PlanMapper;
import com.bentork.ev_system.mapper.UserPlanSelectionMapper;
import com.bentork.ev_system.model.Plan;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.UserPlanSelection;
import com.bentork.ev_system.repository.PlanRepository;
import com.bentork.ev_system.repository.UserPlanSelectionRepository;
import com.bentork.ev_system.repository.UserRepository;

import jakarta.transaction.Transactional;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserPlanSelectionService {

    private final UserPlanSelectionRepository userPlanSelectionRepository;
    private final PlanRepository planRepository;
    private final UserRepository userRepository;

    public UserPlanSelectionService(UserPlanSelectionRepository userPlanSelectionRepository,
                                    PlanRepository planRepository,
                                    UserRepository userRepository) {
        this.userPlanSelectionRepository = userPlanSelectionRepository;
        this.planRepository = planRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public UserPlanSelectionDTO selectPlan(Long userId, Long planId) {
        // fetch plan
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan not found"));

        // fetch user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // check wallet balance
        if (user.getWalletBalance().compareTo(plan.getWalletDeduction()) < 0) {
            throw new RuntimeException("Insufficient wallet balance. Required: "
                    + plan.getWalletDeduction() + ", Available: " + user.getWalletBalance());
        }

        // deduct balance
        user.setWalletBalance(user.getWalletBalance().subtract(plan.getWalletDeduction()));
        userRepository.save(user);

        // deactivate old active plan
        userPlanSelectionRepository.findByUserIdAndIsActiveTrue(userId).ifPresent(existing -> {
            existing.setIsActive(false);
            userPlanSelectionRepository.save(existing);
        });

        // create new plan selection
        UserPlanSelection entity = new UserPlanSelection();
        entity.setUserId(userId);
        entity.setPlanId(planId);
        entity.setSelectedAt(LocalDateTime.now());
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(plan.getDurationMin()));
        entity.setIsActive(true);

        return UserPlanSelectionMapper.toDTO(userPlanSelectionRepository.save(entity));
    }

    // Get active plan
    public UserPlanSelectionDTO getActivePlan(Long userId) {
        return userPlanSelectionRepository.findByUserIdAndIsActiveTrue(userId)
                .map(UserPlanSelectionMapper::toDTO)
                .orElse(null);
    }

    // Get history of plans
    public List<UserPlanSelectionDTO> getUserPlanHistory(Long userId) {
        return userPlanSelectionRepository.findByUserId(userId)
                .stream()
                .map(UserPlanSelectionMapper::toDTO)
                .collect(Collectors.toList());
    }

    // Get all available plans for users
    public List<PlanDTO> getAvailablePlans() {
            List<Plan> plans = planRepository.findAll();

            List<PlanDTO> planDTOs = plans.stream()
                    .map(PlanMapper::toDTO)
                    .collect(Collectors.toList());
            return planDTOs;
    }

    public PlanDTO getPlanById(Long id) {
        return planRepository.findById(id)
                .map(plan -> PlanMapper.toDTO(plan))
                .orElse(new PlanDTO());
    }

        
}
