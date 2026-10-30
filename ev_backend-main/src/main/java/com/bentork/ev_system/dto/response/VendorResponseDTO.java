package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VendorResponseDTO {
    private Long id;
    private String name;
    private String companyName;
    private String gstNumber;
    private String contactPerson;
    private String contactNumber;
    private String email;
    private String address;
    private String bankDetails;
    private String paymentTerms;
    private boolean active;
    private LocalDateTime createdAt;
}
