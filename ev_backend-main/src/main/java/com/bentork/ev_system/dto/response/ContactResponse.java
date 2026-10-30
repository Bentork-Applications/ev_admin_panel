package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactResponse {

    private Long id;
    private Long companyId;
    private String companyName;
    private String name;
    private String designation;
    private String phone;
    private String email;
    private boolean isPrimary;
    private LocalDateTime createdAt;
}
