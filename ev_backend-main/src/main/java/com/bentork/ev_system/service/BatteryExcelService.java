package com.bentork.ev_system.service;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.dto.response.BatteryExcelUploadResponse;
import com.bentork.ev_system.dto.response.BatteryExcelUploadResponse.RowError;
import com.bentork.ev_system.exception.domain.InvalidExcelFileException;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.repository.BatteryDataRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryExcelService {

    private final BatteryDataRepository batteryDataRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Parses an uploaded Excel file and registers each row as a BatteryData entity.
     * Row 1 is treated as the header and is skipped.
     *
     * Expected columns:
     *   A: customerName, B: productDetails, C: invoiceNumber,
     *   D: barcode, E: warrantyStartDate, F: warrantyEndDate
     *
     * @param file       the uploaded Excel file (.xlsx or .xls)
     * @param adminEmail the email of the admin performing the upload
     * @return summary of the upload operation
     */
    public BatteryExcelUploadResponse registerBatteriesFromExcel(MultipartFile file, String adminEmail) {
        validateFile(file);

        List<BatteryDataResponse> registeredBatteries = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        int totalRowsProcessed = 0;

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();

            if (lastRowNum < 1) {
                throw new InvalidExcelFileException("Excel file contains no data rows. Row 1 must be the header.");
            }

            // Start from row 1 (skip header at row 0)
            for (int rowIndex = 1; rowIndex <= lastRowNum; rowIndex++) {
                Row row = sheet.getRow(rowIndex);

                // Skip completely empty rows
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                totalRowsProcessed++;

                try {
                    processRow(row, rowIndex, adminEmail, registeredBatteries);
                } catch (Exception e) {
                    String barcode = getCellStringValue(row.getCell(3));
                    errors.add(RowError.builder()
                            .rowNumber(rowIndex + 1) // 1-based for user display
                            .barcode(barcode != null ? barcode : "N/A")
                            .errorMessage(e.getMessage())
                            .build());
                    log.warn("Error processing row {}: {}", rowIndex + 1, e.getMessage());
                }
            }

        } catch (InvalidExcelFileException e) {
            throw e; // Re-throw our custom exception
        } catch (Exception e) {
            throw new InvalidExcelFileException("Failed to read Excel file: " + e.getMessage(), e);
        }

        log.info("Excel upload complete by admin {}: {} rows processed, {} registered, {} errors",
                adminEmail, totalRowsProcessed, registeredBatteries.size(), errors.size());

        return BatteryExcelUploadResponse.builder()
                .totalRowsProcessed(totalRowsProcessed)
                .successCount(registeredBatteries.size())
                .skippedCount(errors.size())
                .registeredBatteries(registeredBatteries)
                .errors(errors)
                .build();
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Validates that the uploaded file is non-empty and has a valid Excel extension.
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidExcelFileException("Uploaded file is empty. Please upload a valid Excel file.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null ||
                (!originalFilename.toLowerCase().endsWith(".xlsx") &&
                 !originalFilename.toLowerCase().endsWith(".xls"))) {
            throw new InvalidExcelFileException(
                    "Invalid file format. Only .xlsx and .xls files are supported.");
        }
    }

    /**
     * Processes a single row: validates fields, checks for duplicates, saves the entity.
     */
    private void processRow(Row row, int rowIndex, String adminEmail,
                            List<BatteryDataResponse> registeredBatteries) {

        String customerName = getCellStringValue(row.getCell(0));
        String productDetails = getCellStringValue(row.getCell(1));
        String invoiceNumber = getCellStringValue(row.getCell(2));
        String barcode = getCellStringValue(row.getCell(3));
        LocalDate warrantyStartDate = getCellDateValue(row.getCell(4));
        LocalDate warrantyEndDate = getCellDateValue(row.getCell(5));
        String address = getCellStringValue(row.getCell(6));

        // Validate required fields
        validateRequiredFields(rowIndex, customerName, productDetails, invoiceNumber,
                barcode, warrantyStartDate, warrantyEndDate);

        // Check for duplicate barcode
        if (batteryDataRepository.existsByBarcode(barcode)) {
            throw new IllegalArgumentException(
                    "Battery with barcode '" + barcode + "' already exists. Skipping duplicate.");
        }

        // Create and save battery entity
        BatteryData battery = new BatteryData();
        battery.setCustomerName(customerName);
        battery.setProductDetails(productDetails);
        battery.setInvoiceNumber(invoiceNumber);
        battery.setBarcode(barcode);
        battery.setAddress(address);
        battery.setWarrantyStartDate(warrantyStartDate);
        battery.setWarrantyEndDate(warrantyEndDate);
        battery.setCreatedByAdminEmail(adminEmail);

        BatteryData saved = batteryDataRepository.save(battery);
        registeredBatteries.add(mapToResponse(saved));

        log.debug("Row {}: Registered battery with barcode {}", rowIndex + 1, barcode);
    }

    /**
     * Validates that all required fields are present and non-blank.
     */
    private void validateRequiredFields(int rowIndex, String customerName, String productDetails,
                                        String invoiceNumber, String barcode,
                                        LocalDate warrantyStartDate, LocalDate warrantyEndDate) {
        List<String> missingFields = new ArrayList<>();

        if (isBlank(customerName)) missingFields.add("customerName");
        if (isBlank(productDetails)) missingFields.add("productDetails");
        if (isBlank(invoiceNumber)) missingFields.add("invoiceNumber");
        if (isBlank(barcode)) missingFields.add("barcode");
        if (warrantyStartDate == null) missingFields.add("warrantyStartDate");
        if (warrantyEndDate == null) missingFields.add("warrantyEndDate");

        if (!missingFields.isEmpty()) {
            throw new IllegalArgumentException(
                    "Missing required fields: " + String.join(", ", missingFields));
        }

        if (warrantyStartDate != null && warrantyEndDate != null
                && warrantyStartDate.isAfter(warrantyEndDate)) {
            throw new IllegalArgumentException(
                    "warrantyStartDate (" + warrantyStartDate + ") cannot be after warrantyEndDate (" + warrantyEndDate + ")");
        }
    }

    /**
     * Extracts a String value from a cell, handling NUMERIC, STRING, BOOLEAN, and FORMULA types.
     * Returns null if the cell is null or blank.
     */
    private String getCellStringValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        switch (cell.getCellType()) {
            case STRING:
                String value = cell.getStringCellValue();
                return (value != null && !value.trim().isEmpty()) ? value.trim() : null;
            case NUMERIC:
                // If it looks like an integer, return without decimal point
                double numValue = cell.getNumericCellValue();
                if (numValue == Math.floor(numValue) && !Double.isInfinite(numValue)) {
                    return String.valueOf((long) numValue);
                }
                return String.valueOf(numValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            case BLANK:
            default:
                return null;
        }
    }

    /**
     * Extracts a LocalDate from a cell.
     * Handles Excel date-formatted cells and string cells with yyyy-MM-dd format.
     */
    private LocalDate getCellDateValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        switch (cell.getCellType()) {
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue()
                            .toInstant()
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate();
                }
                throw new IllegalArgumentException(
                        "Numeric cell in date column is not date-formatted. Use a date format or 'yyyy-MM-dd' string.");
            case STRING:
                String dateStr = cell.getStringCellValue().trim();
                if (dateStr.isEmpty()) {
                    return null;
                }
                try {
                    return LocalDate.parse(dateStr, DATE_FORMATTER);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException(
                            "Invalid date format: '" + dateStr + "'. Expected format: yyyy-MM-dd");
                }
            default:
                return null;
        }
    }

    /**
     * Checks if a row is completely empty (all cells are blank or null).
     */
    private boolean isRowEmpty(Row row) {
        for (int cellIndex = 0; cellIndex < 8; cellIndex++) {
            Cell cell = row.getCell(cellIndex);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellStringValue(cell);
                if (value != null && !value.isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Maps a BatteryData entity to a BatteryDataResponse DTO.
     * Mirrors the mapping in BatteryDataService.
     */
    private BatteryDataResponse mapToResponse(BatteryData battery) {
        BatteryDataResponse response = new BatteryDataResponse();
        response.setId(battery.getId());
        response.setCustomerName(battery.getCustomerName());
        response.setProductDetails(battery.getProductDetails());
        response.setInvoiceNumber(battery.getInvoiceNumber());
        response.setBarcode(battery.getBarcode());
        response.setAddress(battery.getAddress());
        response.setWarrantyStartDate(battery.getWarrantyStartDate());
        response.setWarrantyEndDate(battery.getWarrantyEndDate());
        response.setWarrantyActive(!LocalDate.now().isAfter(battery.getWarrantyEndDate()));
        response.setCreatedByAdminEmail(battery.getCreatedByAdminEmail());
        response.setCreatedAt(battery.getCreatedAt());
        return response;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
