package com.bentork.ev_system.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.CreateCompanyDTO;
import com.bentork.ev_system.dto.response.CompanyResponse;
import com.bentork.ev_system.service.ActivityService;
import com.bentork.ev_system.service.LeadService;
import com.bentork.ev_system.service.OpportunityService;
import com.bentork.ev_system.service.QuotationService;
import com.bentork.ev_system.service.SalesCompanyService;
import com.bentork.ev_system.service.SalesContactService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/crm/companies")
@RequiredArgsConstructor
@Slf4j
public class CrmCompanyController {

    private final SalesCompanyService companyService;
    private final SalesContactService contactService;
    private final LeadService leadService;
    private final OpportunityService opportunityService;
    private final QuotationService quotationService;
    private final ActivityService activityService;

    @PostMapping("/create")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> createCompany(@RequestBody CreateCompanyDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(companyService.createCompany(dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<CompanyResponse>> getAllCompanies() {
        return ResponseEntity.ok(companyService.getAllCompanies());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getCompanyById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(companyService.getCompanyById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Customer 360° View — returns company with all related data.
     */
    @GetMapping("/{id}/360")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> getCompany360(@PathVariable Long id) {
        try {
            var response = new java.util.HashMap<String, Object>();
            response.put("company", companyService.getCompanyById(id));
            response.put("contacts", contactService.getContactsByCompany(id));
            response.put("leads", leadService.getLeadsByCompany(id));
            response.put("opportunities", opportunityService.getOpportunitiesByCompany(id));
            response.put("quotations", quotationService.getQuotationsForCompany(id));
            response.put("activities", activityService.getActivitiesForCompany(id));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/update")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> updateCompany(@PathVariable Long id, @RequestBody CreateCompanyDTO dto) {
        try {
            return ResponseEntity.ok(companyService.updateCompany(id, dto, getCurrentUserEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<List<CompanyResponse>> searchCompanies(@RequestParam String query) {
        return ResponseEntity.ok(companyService.searchCompanies(query));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SALES_ADMIN', 'ADMIN')")
    public ResponseEntity<?> deactivateCompany(@PathVariable Long id) {
        try {
            companyService.deactivateCompany(id, getCurrentUserEmail());
            return ResponseEntity.ok("Company deactivated successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
