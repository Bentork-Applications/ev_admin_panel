package com.bentork.ev_system.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import com.bentork.ev_system.dto.response.ProductResponse;

@Getter
@Setter
public class MaterialOutResponseDTO {
    private Long id;
    private String issueNumber;
    private ProductResponse product;
    private Integer quantity;
    private String purpose;
    private String issuedTo;
    private String issuedByEmail;
    private LocalDate issueDate;
    private String notes;
    private LocalDateTime createdAt;
}
