package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.BatteryDataDTO;
import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.repository.BatteryDataRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryDataService {

    private final BatteryDataRepository batteryDataRepository;

    /**
     * Register battery data. If startSeriesNumber and endSeriesNumber are provided,
     * expands the series into individual battery records.
     * Otherwise, creates a single battery record using productSerialNumber.
     */
    public List<BatteryDataResponse> registerBattery(BatteryDataDTO dto, String adminEmail) {
        List<BatteryData> savedBatteries = new ArrayList<>();

        if (dto.getStartSeriesNumber() != null && !dto.getStartSeriesNumber().isEmpty()
                && dto.getEndSeriesNumber() != null && !dto.getEndSeriesNumber().isEmpty()) {
            // Series expansion mode
            savedBatteries = expandAndSaveSeries(dto, adminEmail);
        } else {
            // Single battery mode
            if (batteryDataRepository.existsByProductSerialNumber(dto.getProductSerialNumber())) {
                throw new IllegalArgumentException(
                        "Battery with serial number " + dto.getProductSerialNumber() + " already exists");
            }

            BatteryData battery = createBatteryFromDTO(dto, dto.getProductSerialNumber(), adminEmail);
            BatteryData saved = batteryDataRepository.save(battery);
            savedBatteries.add(saved);
            log.info("Registered single battery with serial {} by admin {}", saved.getProductSerialNumber(), adminEmail);
        }

        return savedBatteries.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search batteries by invoice number. Used by mobile app users.
     * Returns battery details with warranty active status.
     */
    public List<BatteryDataResponse> searchByInvoice(String invoiceNumber) {
        List<BatteryData> batteries = batteryDataRepository.findByInvoiceNumber(invoiceNumber);
        if (batteries.isEmpty()) {
            log.info("No batteries found for invoice number: {}", invoiceNumber);
        }
        return batteries.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all batteries. Used by Admin/Staff dashboard.
     */
    public List<BatteryDataResponse> getAllBatteries() {
        return batteryDataRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a single battery by ID.
     */
    public BatteryDataResponse getBatteryById(Long id) {
        BatteryData battery = batteryDataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Battery not found with ID: " + id));
        return mapToResponse(battery);
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Expands a series range into individual battery records.
     * Extracts the numeric suffix from startSeriesNumber and endSeriesNumber,
     * preserves the alpha prefix, and creates one record per serial number.
     *
     * Example: start="BAT001", end="BAT005" → creates BAT001, BAT002, BAT003, BAT004, BAT005
     */
    private List<BatteryData> expandAndSaveSeries(BatteryDataDTO dto, String adminEmail) {
        String startSeries = dto.getStartSeriesNumber();
        String endSeries = dto.getEndSeriesNumber();

        // Extract alpha prefix and numeric suffix
        String prefix = extractPrefix(startSeries);
        int startNum = extractNumericSuffix(startSeries);
        int endNum = extractNumericSuffix(endSeries);

        if (startNum > endNum) {
            throw new IllegalArgumentException("Start series number must be less than or equal to end series number");
        }

        // Determine zero-padding width from the original input
        String startNumStr = startSeries.substring(prefix.length());
        int padWidth = startNumStr.length();

        List<BatteryData> savedBatteries = new ArrayList<>();
        List<String> skippedSerials = new ArrayList<>();

        for (int i = startNum; i <= endNum; i++) {
            String serialNumber = prefix + String.format("%0" + padWidth + "d", i);

            if (batteryDataRepository.existsByProductSerialNumber(serialNumber)) {
                skippedSerials.add(serialNumber);
                log.warn("Skipping duplicate serial number: {}", serialNumber);
                continue;
            }

            BatteryData battery = createBatteryFromDTO(dto, serialNumber, adminEmail);
            savedBatteries.add(batteryDataRepository.save(battery));
        }

        if (!skippedSerials.isEmpty()) {
            log.warn("Skipped {} duplicate serial numbers during series expansion: {}",
                    skippedSerials.size(), skippedSerials);
        }

        log.info("Series expansion complete: {} batteries registered ({}–{}) by admin {}",
                savedBatteries.size(), dto.getStartSeriesNumber(), dto.getEndSeriesNumber(), adminEmail);

        return savedBatteries;
    }

    private BatteryData createBatteryFromDTO(BatteryDataDTO dto, String serialNumber, String adminEmail) {
        BatteryData battery = new BatteryData();
        battery.setCustomerName(dto.getCustomerName());
        battery.setProductDetails(dto.getProductDetails());
        battery.setInvoiceNumber(dto.getInvoiceNumber());
        battery.setBarcode(dto.getBarcode());
        battery.setProductSerialNumber(serialNumber);
        battery.setWarrantyStartDate(dto.getWarrantyStartDate());
        battery.setWarrantyEndDate(dto.getWarrantyEndDate());
        battery.setCreatedByAdminEmail(adminEmail);
        return battery;
    }

    private BatteryDataResponse mapToResponse(BatteryData battery) {
        BatteryDataResponse response = new BatteryDataResponse();
        response.setId(battery.getId());
        response.setCustomerName(battery.getCustomerName());
        response.setProductDetails(battery.getProductDetails());
        response.setInvoiceNumber(battery.getInvoiceNumber());
        response.setBarcode(battery.getBarcode());
        response.setProductSerialNumber(battery.getProductSerialNumber());
        response.setWarrantyStartDate(battery.getWarrantyStartDate());
        response.setWarrantyEndDate(battery.getWarrantyEndDate());
        response.setWarrantyActive(!LocalDate.now().isAfter(battery.getWarrantyEndDate()));
        response.setCreatedByAdminEmail(battery.getCreatedByAdminEmail());
        response.setCreatedAt(battery.getCreatedAt());
        return response;
    }

    /**
     * Extracts the alphabetic prefix from a serial number.
     * Example: "BAT001" → "BAT", "005" → ""
     */
    private String extractPrefix(String serialNumber) {
        StringBuilder prefix = new StringBuilder();
        for (char c : serialNumber.toCharArray()) {
            if (Character.isDigit(c)) {
                break;
            }
            prefix.append(c);
        }
        return prefix.toString();
    }

    /**
     * Extracts the numeric suffix from a serial number.
     * Example: "BAT001" → 1, "005" → 5
     */
    private int extractNumericSuffix(String serialNumber) {
        String prefix = extractPrefix(serialNumber);
        String numPart = serialNumber.substring(prefix.length());
        if (numPart.isEmpty()) {
            throw new IllegalArgumentException("Serial number must contain a numeric suffix: " + serialNumber);
        }
        try {
            return Integer.parseInt(numPart);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid numeric suffix in serial number: " + serialNumber);
        }
    }
}
