package com.bentork.ev_system.dto.request;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddLeadsToCampaignDTO {

    private List<Long> leadIds;
    private Long targetOwnerAdminId; // Optional default owner for these members
}
