package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateRequirementDTO;
import com.bentork.ev_system.dto.request.UpdateRequirementDTO;
import com.bentork.ev_system.dto.response.RequirementResponse;
import com.bentork.ev_system.model.Lead;
import com.bentork.ev_system.model.Requirement;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.LeadRepository;
import com.bentork.ev_system.repository.RequirementRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RequirementService {

    private final RequirementRepository requirementRepository;
    private final LeadRepository leadRepository;
    private final SalesCompanyRepository salesCompanyRepository;

    @Transactional
    public RequirementResponse createRequirement(CreateRequirementDTO dto) {
        Requirement requirement = new Requirement();

        if (dto.getLeadId() != null) {
            Lead lead = leadRepository.findById(dto.getLeadId())
                    .orElseThrow(() -> new IllegalArgumentException("Lead not found with id: " + dto.getLeadId()));
            requirement.setLead(lead);
        }

        if (dto.getCompanyId() != null) {
            SalesCompany company = salesCompanyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + dto.getCompanyId()));
            requirement.setCompany(company);
        }

        requirement.setProductCategory(dto.getProductCategory());
        requirement.setVoltage(dto.getVoltage());
        requirement.setCapacity(dto.getCapacity());
        requirement.setChemistry(dto.getChemistry());
        requirement.setQuantity(dto.getQuantity());
        requirement.setTimeline(dto.getTimeline());
        requirement.setBudget(dto.getBudget());
        requirement.setNotes(dto.getNotes());

        Requirement saved = requirementRepository.save(requirement);
        return mapToResponse(saved);
    }

    public List<RequirementResponse> getAllRequirements() {
        return requirementRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public RequirementResponse getRequirementById(Long id) {
        Requirement requirement = requirementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Requirement not found with id: " + id));
        return mapToResponse(requirement);
    }

    public List<RequirementResponse> getRequirementsByLeadId(Long leadId) {
        return requirementRepository.findByLeadIdOrderByCreatedAtDesc(leadId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<RequirementResponse> getRequirementsByCompanyId(Long companyId) {
        return requirementRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public RequirementResponse updateRequirement(Long id, UpdateRequirementDTO dto) {
        Requirement requirement = requirementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Requirement not found with id: " + id));

        if (dto.getProductCategory() != null) requirement.setProductCategory(dto.getProductCategory());
        if (dto.getVoltage() != null) requirement.setVoltage(dto.getVoltage());
        if (dto.getCapacity() != null) requirement.setCapacity(dto.getCapacity());
        if (dto.getChemistry() != null) requirement.setChemistry(dto.getChemistry());
        if (dto.getQuantity() != null) requirement.setQuantity(dto.getQuantity());
        if (dto.getTimeline() != null) requirement.setTimeline(dto.getTimeline());
        if (dto.getBudget() != null) requirement.setBudget(dto.getBudget());
        if (dto.getNotes() != null) requirement.setNotes(dto.getNotes());

        Requirement updated = requirementRepository.save(requirement);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteRequirement(Long id) {
        if (!requirementRepository.existsById(id)) {
            throw new IllegalArgumentException("Requirement not found with id: " + id);
        }
        requirementRepository.deleteById(id);
    }

    private RequirementResponse mapToResponse(Requirement requirement) {
        RequirementResponse response = new RequirementResponse();
        response.setId(requirement.getId());

        if (requirement.getLead() != null) {
            response.setLeadId(requirement.getLead().getId());
            response.setLeadTitle(requirement.getLead().getTitle());
        }

        if (requirement.getCompany() != null) {
            response.setCompanyId(requirement.getCompany().getId());
            response.setCompanyName(requirement.getCompany().getName());
        }

        response.setProductCategory(requirement.getProductCategory());
        response.setVoltage(requirement.getVoltage());
        response.setCapacity(requirement.getCapacity());
        response.setChemistry(requirement.getChemistry());
        response.setQuantity(requirement.getQuantity());
        response.setTimeline(requirement.getTimeline());
        response.setBudget(requirement.getBudget());
        response.setNotes(requirement.getNotes());
        response.setCreatedAt(requirement.getCreatedAt());

        return response;
    }
}
