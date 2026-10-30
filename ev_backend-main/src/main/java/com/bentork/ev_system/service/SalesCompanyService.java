package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.CreateCompanyDTO;
import com.bentork.ev_system.dto.response.CompanyResponse;
import com.bentork.ev_system.dto.response.PagedResponse;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.SalesCompanyRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesCompanyService {

    private final SalesCompanyRepository companyRepository;
    private final AdminRepository adminRepository;

    @Transactional
    public CompanyResponse createCompany(CreateCompanyDTO dto, String adminEmail) {
        Admin owner = adminRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        SalesCompany company = new SalesCompany();
        company.setName(dto.getName());
        company.setIndustry(dto.getIndustry());
        company.setCompanyType(dto.getCompanyType());
        company.setGstNumber(dto.getGstNumber());
        company.setPhone(dto.getPhone());
        company.setEmail(dto.getEmail());
        company.setWebsite(dto.getWebsite());
        company.setAddress(dto.getAddress());
        company.setCity(dto.getCity());
        company.setState(dto.getState());
        company.setPincode(dto.getPincode());
        company.setSource(dto.getSource());
        company.setNotes(dto.getNotes());
        company.setOwnerAdmin(owner);

        SalesCompany saved = companyRepository.save(company);
        log.info("SalesCompany '{}' created by {}", saved.getName(), adminEmail);
        return mapToResponse(saved);
    }

    public CompanyResponse updateCompany(Long id, CreateCompanyDTO dto, String adminEmail) {
        SalesCompany company = findById(id);

        company.setName(dto.getName());
        company.setIndustry(dto.getIndustry());
        company.setCompanyType(dto.getCompanyType());
        company.setGstNumber(dto.getGstNumber());
        company.setPhone(dto.getPhone());
        company.setEmail(dto.getEmail());
        company.setWebsite(dto.getWebsite());
        company.setAddress(dto.getAddress());
        company.setCity(dto.getCity());
        company.setState(dto.getState());
        company.setPincode(dto.getPincode());
        company.setSource(dto.getSource());
        company.setNotes(dto.getNotes());

        SalesCompany saved = companyRepository.save(company);
        log.info("SalesCompany '{}' updated by {}", saved.getName(), adminEmail);
        return mapToResponse(saved);
    }

    public CompanyResponse getCompanyById(Long id) {
        return mapToResponse(findById(id));
    }

    public List<CompanyResponse> getAllCompanies() {
        return companyRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public PagedResponse<CompanyResponse> getAllCompaniesPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<SalesCompany> companyPage = companyRepository.findByActiveTrueOrderByCreatedAtDesc(pageable);
        List<CompanyResponse> content = companyPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
        return PagedResponse.of(content, page, size, companyPage.getTotalElements(), companyPage.getTotalPages(), companyPage.isLast());
    }

    public List<CompanyResponse> getCompaniesByOwner(Long adminId) {
        return companyRepository.findByOwnerAdminIdAndActiveTrueOrderByCreatedAtDesc(adminId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<CompanyResponse> searchCompanies(String query) {
        return companyRepository.findByNameContainingIgnoreCaseAndActiveTrue(query).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deactivateCompany(Long id, String adminEmail) {
        SalesCompany company = findById(id);
        company.setActive(false);
        companyRepository.save(company);
        log.info("SalesCompany '{}' deactivated by {}", company.getName(), adminEmail);
    }

    // ==================== HELPERS ====================

    public SalesCompany findById(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with ID: " + id));
    }

    public CompanyResponse mapToResponse(SalesCompany company) {
        CompanyResponse response = new CompanyResponse();
        response.setId(company.getId());
        response.setName(company.getName());
        response.setIndustry(company.getIndustry());
        response.setCompanyType(company.getCompanyType());
        response.setGstNumber(company.getGstNumber());
        response.setPhone(company.getPhone());
        response.setEmail(company.getEmail());
        response.setWebsite(company.getWebsite());
        response.setAddress(company.getAddress());
        response.setCity(company.getCity());
        response.setState(company.getState());
        response.setPincode(company.getPincode());
        response.setSource(company.getSource());
        response.setNotes(company.getNotes());
        response.setActive(company.isActive());
        response.setCreatedAt(company.getCreatedAt());
        response.setUpdatedAt(company.getUpdatedAt());

        if (company.getOwnerAdmin() != null) {
            response.setOwnerAdminId(company.getOwnerAdmin().getId());
            response.setOwnerAdminName(company.getOwnerAdmin().getName());
        }

        return response;
    }
}
