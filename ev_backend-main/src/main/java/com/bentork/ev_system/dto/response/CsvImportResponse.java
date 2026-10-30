package com.bentork.ev_system.dto.response;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class CsvImportResponse {

    private int totalRows;
    private int importedCount;
    private int skippedCount;
    private List<String> errors = new ArrayList<>();
}
