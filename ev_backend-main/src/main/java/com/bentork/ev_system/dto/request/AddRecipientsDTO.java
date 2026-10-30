package com.bentork.ev_system.dto.request;

import java.util.List;

import lombok.Data;

@Data
public class AddRecipientsDTO {
    private List<Long> companyIds;
    private List<Long> contactIds; // optional, for more granular targeting
}
