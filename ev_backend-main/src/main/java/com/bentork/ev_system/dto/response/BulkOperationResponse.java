package com.bentork.ev_system.dto.response;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class BulkOperationResponse {

    private int totalRequested;
    private int successCount;
    private int failureCount;
    private List<String> errors = new ArrayList<>();

    public static BulkOperationResponse success(int count) {
        BulkOperationResponse response = new BulkOperationResponse();
        response.setTotalRequested(count);
        response.setSuccessCount(count);
        response.setFailureCount(0);
        return response;
    }
}
