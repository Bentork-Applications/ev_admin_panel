package com.bentork.ev_system.dto.response;

import java.util.List;

import lombok.Data;

@Data
public class AudienceSegmentResponse {
    private List<Long> matchedCompanyIds;
    private List<Long> matchedLeadIds;
    private int totalMatched;
}
