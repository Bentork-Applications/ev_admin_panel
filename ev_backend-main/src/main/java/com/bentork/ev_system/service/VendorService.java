package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.VendorRequestDTO;
import com.bentork.ev_system.dto.response.VendorResponseDTO;
import com.bentork.ev_system.model.Vendor;
import com.bentork.ev_system.repository.VendorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;

    public VendorResponseDTO createVendor(VendorRequestDTO dto, String createdByEmail) {
        Vendor vendor = new Vendor();
        vendor.setName(dto.getName());
        vendor.setCompanyName(dto.getCompanyName());
        vendor.setGstNumber(dto.getGstNumber());
        vendor.setContactPerson(dto.getContactPerson());
        vendor.setContactNumber(dto.getContactNumber());
        vendor.setEmail(dto.getEmail());
        vendor.setAddress(dto.getAddress());
        vendor.setBankDetails(dto.getBankDetails());
        vendor.setPaymentTerms(dto.getPaymentTerms());
        vendor.setCreatedByEmail(createdByEmail);
        vendor.setActive(true);
        
        Vendor savedVendor = vendorRepository.save(vendor);
        return mapToResponse(savedVendor);
    }

    public List<VendorResponseDTO> getAllActiveVendors() {
        return vendorRepository.findByActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public VendorResponseDTO getVendorById(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vendor not found with id: " + id));
        return mapToResponse(vendor);
    }

    public VendorResponseDTO mapToResponse(Vendor vendor) {
        VendorResponseDTO dto = new VendorResponseDTO();
        dto.setId(vendor.getId());
        dto.setName(vendor.getName());
        dto.setCompanyName(vendor.getCompanyName());
        dto.setGstNumber(vendor.getGstNumber());
        dto.setContactPerson(vendor.getContactPerson());
        dto.setContactNumber(vendor.getContactNumber());
        dto.setEmail(vendor.getEmail());
        dto.setAddress(vendor.getAddress());
        dto.setBankDetails(vendor.getBankDetails());
        dto.setPaymentTerms(vendor.getPaymentTerms());
        dto.setActive(vendor.isActive());
        dto.setCreatedAt(vendor.getCreatedAt());
        return dto;
    }
}
