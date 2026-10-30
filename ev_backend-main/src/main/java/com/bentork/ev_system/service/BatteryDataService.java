package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.BatteryDataDTO;
import com.bentork.ev_system.dto.request.WarrantyStatusUpdateDTO;
import com.bentork.ev_system.dto.response.BatteryDataResponse;
import com.bentork.ev_system.model.BatteryData;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.BatteryDataRepository;
import com.bentork.ev_system.repository.OrderRepository;
import com.bentork.ev_system.repository.ProductRepository;
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
    private final ProductRepository productRepository;

    /**
     * Register battery data. If startBarcode and endBarcode are provided,
     * expands the range into individual battery records.
     * Otherwise, creates a single battery record using the barcode field.
     *
     * If productId is provided, resolves the product from the catalog
     * and auto-populates productDetails from the Product spec string.
     */
    public List<BatteryDataResponse> registerBattery(BatteryDataDTO dto, String adminEmail) {
        // Resolve product if productId is provided
        Product product = resolveProduct(dto);

        List<BatteryData> savedBatteries = new ArrayList<>();

        if (dto.getStartBarcode() != null && !dto.getStartBarcode().isEmpty()
                && dto.getEndBarcode() != null && !dto.getEndBarcode().isEmpty()) {
            // Bulk barcode expansion mode
            savedBatteries = expandAndSaveBarcodes(dto, product, adminEmail);
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

            BatteryData battery = createBatteryFromDTO(dto, dto.getBarcode(), product, adminEmail);
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

    /**
     * Update an existing battery record. Admin only.
     */
    public BatteryDataResponse updateBattery(Long id, BatteryDataDTO dto, String adminEmail) {
        BatteryData battery = batteryDataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Battery not found with ID: " + id));

        if (dto.getBarcode() != null && !dto.getBarcode().trim().isEmpty() && !dto.getBarcode().equals(battery.getBarcode())) {
            if (batteryDataRepository.existsByBarcode(dto.getBarcode())) {
                throw new IllegalArgumentException("Battery with barcode " + dto.getBarcode() + " already exists");
            }
            battery.setBarcode(dto.getBarcode());
        }

        if (dto.getCustomerName() != null) battery.setCustomerName(dto.getCustomerName());
        if (dto.getInvoiceNumber() != null) battery.setInvoiceNumber(dto.getInvoiceNumber());
        if (dto.getAddress() != null) battery.setAddress(dto.getAddress());
        if (dto.getWarrantyStartDate() != null) battery.setWarrantyStartDate(dto.getWarrantyStartDate());
        if (dto.getWarrantyEndDate() != null) battery.setWarrantyEndDate(dto.getWarrantyEndDate());
        if (dto.getServiceWarrantyStartDate() != null) battery.setServiceWarrantyStartDate(dto.getServiceWarrantyStartDate());
        if (dto.getServiceWarrantyEndDate() != null) battery.setServiceWarrantyEndDate(dto.getServiceWarrantyEndDate());

        // Update product reference if provided
        if (dto.getProductId() != null) {
            Product product = productRepository.findById(dto.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + dto.getProductId()));
            if (!product.isActive()) {
                throw new IllegalArgumentException("Product '" + product.getName() + "' is inactive and cannot be assigned");
            }
            battery.setProductId(product.getId());
            battery.setProductDetails(product.buildSpecString());
        } else if (dto.getProductDetails() != null) {
            battery.setProductDetails(dto.getProductDetails());
        }

        BatteryData updated = batteryDataRepository.save(battery);
        log.info("Admin {} updated battery with ID: {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        return mapToResponse(updated);
    }

    /**
     * Hard-delete a battery record. Admin only.
     */
    public void deleteBattery(Long id, String adminEmail) {
        BatteryData battery = batteryDataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Battery not found with ID: " + id));
        batteryDataRepository.delete(battery);
        log.info("Admin {} deleted battery with ID: {}", PiiMaskingUtil.maskEmail(adminEmail), id);
    }

    /**
     * Update the warranty status and reason manually. Admin only.
     */
    public BatteryDataResponse updateWarrantyStatus(Long id, WarrantyStatusUpdateDTO dto, String adminEmail) {
        BatteryData battery = batteryDataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Battery not found with ID: " + id));

        if (dto.getFullWarrantyActive() != null) {
            battery.setFullWarrantyActive(dto.getFullWarrantyActive());
        }
        if (dto.getFullWarrantyStatusReason() != null) {
            battery.setFullWarrantyStatusReason(dto.getFullWarrantyStatusReason());
        }
        
        if (dto.getServiceWarrantyActive() != null) {
            battery.setServiceWarrantyActive(dto.getServiceWarrantyActive());
        }
        if (dto.getServiceWarrantyStatusReason() != null) {
            battery.setServiceWarrantyStatusReason(dto.getServiceWarrantyStatusReason());
        }

        BatteryData updated = batteryDataRepository.save(battery);
        log.info("Admin {} updated warranty status for battery ID: {}", PiiMaskingUtil.maskEmail(adminEmail), id);
        return mapToResponse(updated);
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Resolves a Product from the catalog if productId is provided.
     * If productId is given, validates the product exists and is active,
     * and auto-populates productDetails on the DTO from the product spec string.
     */
    private Product resolveProduct(BatteryDataDTO dto) {
        if (dto.getProductId() == null) {
            return null;
        }
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + dto.getProductId()));
        if (!product.isActive()) {
            throw new IllegalArgumentException("Product '" + product.getName() + "' is inactive and cannot be used for registration");
        }
        // Auto-populate productDetails from the product catalog if not explicitly set
        if (dto.getProductDetails() == null || dto.getProductDetails().trim().isEmpty()) {
            dto.setProductDetails(product.buildSpecString());
        }
        return product;
    }

    /**
     * Expands a barcode range into individual battery records.
     * Extracts the numeric suffix from startBarcode and endBarcode,
     * preserves the alpha prefix, and creates one record per barcode.
     *
     * Example: start="BAR001", end="BAR005" → creates BAR001, BAR002, BAR003, BAR004, BAR005
     */
    private List<BatteryData> expandAndSaveBarcodes(BatteryDataDTO dto, Product product, String adminEmail) {
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

            BatteryData battery = createBatteryFromDTO(dto, barcodeValue, product, adminEmail);
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

    private BatteryData createBatteryFromDTO(BatteryDataDTO dto, String barcode, Product product, String adminEmail) {
        BatteryData battery = new BatteryData();
        battery.setCustomerName(dto.getCustomerName());
        battery.setProductDetails(dto.getProductDetails());
        battery.setInvoiceNumber(dto.getInvoiceNumber());
        battery.setBarcode(barcode);
        battery.setAddress(dto.getAddress());
        battery.setWarrantyStartDate(dto.getWarrantyStartDate());
        battery.setWarrantyEndDate(dto.getWarrantyEndDate());
        battery.setServiceWarrantyStartDate(dto.getServiceWarrantyStartDate());
        battery.setServiceWarrantyEndDate(dto.getServiceWarrantyEndDate());
        battery.setCreatedByAdminEmail(adminEmail);

        // Link to product catalog if resolved
        if (product != null) {
            battery.setProductId(product.getId());
        }

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

        // Resolve product info from catalog if linked
        if (battery.getProductId() != null) {
            response.setProductId(battery.getProductId());
            productRepository.findById(battery.getProductId()).ifPresent(product -> {
                response.setProductName(product.getName());
                response.setProductCategory(product.getCategory());
                response.setProductModelNumber(product.getModelNumber());
                response.setProductSpecString(product.buildSpecString());
            });
        }

        // Full Warranty
        response.setWarrantyStartDate(battery.getWarrantyStartDate());
        response.setWarrantyEndDate(battery.getWarrantyEndDate());
        response.setFullWarrantyStatusReason(battery.getFullWarrantyStatusReason());
        LocalDate now = LocalDate.now();
        boolean fullActive = battery.isFullWarrantyActive() && !now.isAfter(battery.getWarrantyEndDate());
        response.setFullWarrantyActive(fullActive);

        // Service Warranty
        response.setServiceWarrantyStartDate(battery.getServiceWarrantyStartDate());
        response.setServiceWarrantyEndDate(battery.getServiceWarrantyEndDate());
        response.setServiceWarrantyStatusReason(battery.getServiceWarrantyStatusReason());
        boolean serviceActive = battery.isServiceWarrantyActive() && battery.getServiceWarrantyEndDate() != null
                && !now.isAfter(battery.getServiceWarrantyEndDate());
        response.setServiceWarrantyActive(serviceActive);

        // Overall warranty status
        if (fullActive) {
            response.setActiveWarrantyType("full_warranty");
        } else if (serviceActive) {
            response.setActiveWarrantyType("service_warranty");
        } else {
            response.setActiveWarrantyType("expired");
        }

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
