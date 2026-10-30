package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateContactDTO;
import com.bentork.ev_system.dto.response.ContactResponse;
import com.bentork.ev_system.service.SalesContactService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/contacts")
@RequiredArgsConstructor
@Slf4j
public class CrmContactController {

    private final SalesContactService contactService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createContact(@RequestBody CreateContactDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(contactService.createContact(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/company/{companyId}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ContactResponse>> getContactsByCompany(@PathVariable Long companyId) {
        return ResponseEntity.ok(contactService.getContactsByCompany(companyId));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<ContactResponse>> getAllContacts() {
        return ResponseEntity.ok(contactService.getAllContacts());
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> searchByPhone(@RequestParam String phone) {
        ContactResponse contact = contactService.searchByPhone(phone);
        if (contact == null) {
            return ResponseEntity.ok(java.util.Collections.emptyMap());
        }
        return ResponseEntity.ok(contact);
    }

    private String getCurrentUserEmail() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
    }
}
