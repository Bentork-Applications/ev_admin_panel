package com.bentork.ev_system.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PauseMembershipDTO {

    private String reason; // "MANUAL", "REPLIED", "OPT_OUT", "CONVERTED"
    private String notes;
}
