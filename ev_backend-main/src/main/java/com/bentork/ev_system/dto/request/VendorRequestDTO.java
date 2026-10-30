package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VendorRequestDTO {
    
    @NotBlank(message = "Vendor name is required")
    private String name;
    
    private String companyName;
    
    private String gstNumber;
    private String contactPerson;
    private String contactNumber;
    private String email;
    private String address;
    private String bankDetails;
    private String paymentTerms;
}
