package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.BatteryDataDTO;
import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.BatteryDataRepository;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatteryDataService {

    private final BatteryDataRepository batteryDataRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    /**
     * Register battery data. If startBarcode and endBarcode are provided,
     * expands the range into individual battery records.
     * Otherwise, creates a single battery record using the barcode field.
     */
    public List<BatteryDataResponse> registerBattery(BatteryDataDTO dto, String adminEmail) {
        List<BatteryData> savedBatteries = new ArrayList<>();

        if (dto.getStartBarcode() != null && !dto.getStartBarcode().isEmpty()
                && dto.getEndBarcode() != null && !dto.getEndBarcode().isEmpty()) {
            // Bulk barcode expansion mode
            savedBatteries = expandAndSaveBarcodes(dto, adminEmail);
        } else {
            // Single battery mode
            if (dto.getBarcode() == null || dto.getBarcode().trim().isEmpty()) {
                throw new IllegalArgumentException(
                        "Barcode is required. Provide either 'barcode' for single registration or 'startBarcode'/'endBarcode' for bulk registration.");
            }
            if (batteryDataRepository.existsByBarcode(dto.getBarcode())) {
                throw new IllegalArgumentException(
                        "Battery with barcode " + dto.getBarcode() + " already exists");
            }

            BatteryData battery = createBatteryFromDTO(dto, dto.getBarcode(), adminEmail);
            BatteryData saved = batteryDataRepository.save(battery);
            savedBatteries.add(saved);
            log.info("Registered single battery with barcode {} by admin {}", saved.getBarcode(), PiiMaskingUtil.maskEmail(adminEmail));
        }

        return savedBatteries.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search batteries by invoice number. Used by mobile app users.
     * Standard users are restricted to searching only invoice numbers
     * that belong to their own orders (matched via Order.assignedUserId).
     * Returns battery details with warranty active status.
     */
    public List<BatteryDataResponse> searchByInvoice(String invoiceNumber, String userEmail) {
        // Resolve the user and verify invoice ownership
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean ownsInvoice = orderRepository.existsByInvoiceNumberAndAssignedUserId(
                invoiceNumber, user.getId());
        if (!ownsInvoice) {
            throw new IllegalArgumentException(
                    "You do not have access to search this invoice number.");
        }

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
     * Expands a barcode range into individual battery records.
     * Extracts the numeric suffix from startBarcode and endBarcode,
     * preserves the alpha prefix, and creates one record per barcode.
     *
     * Example: start="BAR001", end="BAR005" → creates BAR001, BAR002, BAR003, BAR004, BAR005
     */
    private List<BatteryData> expandAndSaveBarcodes(BatteryDataDTO dto, String adminEmail) {
        String startBarcode = dto.getStartBarcode();
        String endBarcode = dto.getEndBarcode();

        // Extract alpha prefix and numeric suffix
        String prefix = extractPrefix(startBarcode);
        int startNum = extractNumericSuffix(startBarcode);
        int endNum = extractNumericSuffix(endBarcode);

        if (startNum > endNum) {
            throw new IllegalArgumentException("Start barcode must be less than or equal to end barcode");
        }

        // Determine zero-padding width from the original input
        String startNumStr = startBarcode.substring(prefix.length());
        int padWidth = startNumStr.length();

        List<BatteryData> savedBatteries = new ArrayList<>();
        List<String> skippedBarcodes = new ArrayList<>();

        for (int i = startNum; i <= endNum; i++) {
            String barcodeValue = prefix + String.format("%0" + padWidth + "d", i);

            if (batteryDataRepository.existsByBarcode(barcodeValue)) {
                skippedBarcodes.add(barcodeValue);
                log.warn("Skipping duplicate barcode: {}", barcodeValue);
                continue;
            }

            BatteryData battery = createBatteryFromDTO(dto, barcodeValue, adminEmail);
            savedBatteries.add(batteryDataRepository.save(battery));
        }

        if (!skippedBarcodes.isEmpty()) {
            log.warn("Skipped {} duplicate barcodes during bulk expansion: {}",
                    skippedBarcodes.size(), skippedBarcodes);
        }

        log.info("Bulk barcode expansion complete: {} batteries registered ({}–{}) by admin {}",
                savedBatteries.size(), dto.getStartBarcode(), dto.getEndBarcode(), adminEmail);

        return savedBatteries;
    }

    private BatteryData createBatteryFromDTO(BatteryDataDTO dto, String barcode, String adminEmail) {
        BatteryData battery = new BatteryData();
        battery.setCustomerName(dto.getCustomerName());
        battery.setProductDetails(dto.getProductDetails());
        battery.setInvoiceNumber(dto.getInvoiceNumber());
        battery.setBarcode(barcode);
        battery.setAddress(dto.getAddress());
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
        response.setAddress(battery.getAddress());
        response.setWarrantyStartDate(battery.getWarrantyStartDate());
        response.setWarrantyEndDate(battery.getWarrantyEndDate());
        response.setWarrantyActive(!LocalDate.now().isAfter(battery.getWarrantyEndDate()));
        response.setCreatedByAdminEmail(battery.getCreatedByAdminEmail());
        response.setCreatedAt(battery.getCreatedAt());
        return response;
    }

    /**
     * Extracts the alphabetic prefix from a barcode.
     * Example: "BAR001" → "BAR", "005" → ""
     */
    private String extractPrefix(String barcode) {
        StringBuilder prefix = new StringBuilder();
        for (char c : barcode.toCharArray()) {
            if (Character.isDigit(c)) {
                break;
            }
            prefix.append(c);
        }
        return prefix.toString();
    }

    /**
     * Extracts the numeric suffix from a barcode.
     * Example: "BAR001" → 1, "005" → 5
     */
    private int extractNumericSuffix(String barcode) {
        String prefix = extractPrefix(barcode);
        String numPart = barcode.substring(prefix.length());
        if (numPart.isEmpty()) {
            throw new IllegalArgumentException("Barcode must contain a numeric suffix: " + barcode);
        }
        try {
            return Integer.parseInt(numPart);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid numeric suffix in barcode: " + barcode);
        }
    }
}
