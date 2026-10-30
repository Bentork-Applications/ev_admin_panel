package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.CreateAutomationRuleDTO;
import com.bentork.ev_system.dto.response.AutomationRuleResponse;
import com.bentork.ev_system.model.AutomationRule;
import com.bentork.ev_system.repository.AutomationRuleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AutomationRuleService {

    private final AutomationRuleRepository ruleRepository;

    public AutomationRuleResponse createRule(CreateAutomationRuleDTO dto) {
        AutomationRule rule = new AutomationRule();
        rule.setName(dto.getName());
        rule.setDescription(dto.getDescription());
        rule.setTriggerEvent(dto.getTriggerEvent());
        rule.setActionType(dto.getActionType());
        rule.setActionPayload(dto.getActionPayload());
        rule.setActive(dto.isActive());
        
        return mapToResponse(ruleRepository.save(rule));
    }
    
    public AutomationRuleResponse updateRule(Long id, CreateAutomationRuleDTO dto) {
        AutomationRule rule = ruleRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Rule not found with id: " + id));
            
        rule.setName(dto.getName());
        rule.setDescription(dto.getDescription());
        rule.setTriggerEvent(dto.getTriggerEvent());
        rule.setActionType(dto.getActionType());
        rule.setActionPayload(dto.getActionPayload());
        rule.setActive(dto.isActive());
        
        return mapToResponse(ruleRepository.save(rule));
    }

    public List<AutomationRuleResponse> getAllRules() {
        return ruleRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    public void deleteRule(Long id) {
        ruleRepository.deleteById(id);
    }
    
    private AutomationRuleResponse mapToResponse(AutomationRule rule) {
        AutomationRuleResponse response = new AutomationRuleResponse();
        response.setId(rule.getId());
        response.setName(rule.getName());
        response.setDescription(rule.getDescription());
        response.setTriggerEvent(rule.getTriggerEvent());
        response.setActionType(rule.getActionType());
        response.setActionPayload(rule.getActionPayload());
        response.setActive(rule.isActive());
        response.setCreatedAt(rule.getCreatedAt());
        response.setUpdatedAt(rule.getUpdatedAt());
        return response;
    }
}
