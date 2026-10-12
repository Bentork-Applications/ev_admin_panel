package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateContactDTO {

    private Long companyId;
    private String name;
    private String designation;
    private String phone;
    private String email;
    private boolean isPrimary;
}
