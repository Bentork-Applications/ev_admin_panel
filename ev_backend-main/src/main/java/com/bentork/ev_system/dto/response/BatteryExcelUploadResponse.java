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
public class BatteryExcelUploadResponse {

    private int totalRowsProcessed;
    private int successCount;
    private int skippedCount;
    private List<BatteryDataResponse> registeredBatteries;
    private List<RowError> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowError {
        private int rowNumber;
        private String barcode;
        private String errorMessage;
    }
}
