package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CompanyResponse {

    private Long id;
    private String name;
    private String industry;
    private String companyType;
    private String gstNumber;
    private String phone;
    private String email;
    private String website;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String source;
    private String notes;
    private Long ownerAdminId;
    private String ownerAdminName;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
