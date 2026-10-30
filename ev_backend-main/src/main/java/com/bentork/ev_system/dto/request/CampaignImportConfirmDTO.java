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
public class CampaignImportConfirmDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowData {
        private String name;
        private String phone;
        private String email;
        private String company;
        private String city;
        private String state;
        private String notes;
        private Double estimatedValue;
    }

    private List<RowData> rows;
    private Long defaultOwnerAdminId;
    private boolean createLeadsForNew;
}
