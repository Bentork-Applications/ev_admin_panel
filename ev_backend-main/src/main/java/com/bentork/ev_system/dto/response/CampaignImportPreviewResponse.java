package com.bentork.ev_system.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignImportPreviewResponse {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowPreview {
        private int rowNumber;
        private String name;
        private String rawPhone;
        private String normalizedPhone;
        private String email;
        private String company;
        private boolean valid;
        private String validationError;
        private boolean alreadyExistsInCrm;
        private Long matchedLeadId;
        private String matchedLeadNumber;
        private boolean alreadyInCampaign;
        private boolean optedOut;
    }

    private int totalRows;
    private int validRows;
    private int invalidRows;
    private int newLeadsCount;
    private int matchedLeadsCount;
    private int alreadyInCampaignCount;
    private int optedOutCount;

    private List<RowPreview> rows;
    private List<String> errorSummary;
}
