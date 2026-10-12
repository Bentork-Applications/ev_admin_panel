package com.bentork.ev_system.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateOpportunityStageDTO {

    private String stage;
    private String lostReason; // Required only when stage = "lost"
}
