package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCompanyDTO {

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
}
