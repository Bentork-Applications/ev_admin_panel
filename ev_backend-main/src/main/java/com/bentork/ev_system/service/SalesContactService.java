package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.CreateContactDTO;
import com.bentork.ev_system.dto.response.ContactResponse;
import com.bentork.ev_system.model.SalesCompany;
import com.bentork.ev_system.model.SalesContact;
import com.bentork.ev_system.repository.SalesContactRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalesContactService {

    private final SalesContactRepository contactRepository;
    private final SalesCompanyService companyService;

    public ContactResponse createContact(CreateContactDTO dto) {
        if (contactRepository.existsByPhone(dto.getPhone())) {
            throw new IllegalArgumentException("Contact with phone '" + dto.getPhone() + "' already exists");
        }

        SalesContact contact = new SalesContact();
        contact.setName(dto.getName());
        contact.setDesignation(dto.getDesignation());
        contact.setPhone(dto.getPhone());
        contact.setEmail(dto.getEmail());
        contact.setPrimary(dto.isPrimary());

        if (dto.getCompanyId() != null) {
            SalesCompany company = companyService.findById(dto.getCompanyId());
            contact.setCompany(company);
        }

        SalesContact saved = contactRepository.save(contact);
        log.info("SalesContact '{}' created with phone {}", saved.getName(), saved.getPhone());
        return mapToResponse(saved);
    }

    public List<ContactResponse> getContactsByCompany(Long companyId) {
        return contactRepository.findByCompanyIdOrderByIsPrimaryDescNameAsc(companyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ContactResponse searchByPhone(String phone) {
        SalesContact contact = contactRepository.findByPhone(phone)
                .orElse(null);
        return contact != null ? mapToResponse(contact) : null;
    }

    public List<ContactResponse> searchContacts(String query) {
        return contactRepository.findByNameContainingIgnoreCase(query).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SalesContact findById(Long id) {
        return contactRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found with ID: " + id));
    }

    // ==================== HELPERS ====================

    public ContactResponse mapToResponse(SalesContact contact) {
        ContactResponse response = new ContactResponse();
        response.setId(contact.getId());
        response.setName(contact.getName());
        response.setDesignation(contact.getDesignation());
        response.setPhone(contact.getPhone());
        response.setEmail(contact.getEmail());
        response.setPrimary(contact.isPrimary());
        response.setCreatedAt(contact.getCreatedAt());

        if (contact.getCompany() != null) {
            response.setCompanyId(contact.getCompany().getId());
            response.setCompanyName(contact.getCompany().getName());
        }

        return response;
    }
}
