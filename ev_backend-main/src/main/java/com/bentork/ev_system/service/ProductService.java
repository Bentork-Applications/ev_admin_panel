package com.bentork.ev_system.service;

import com.bentork.ev_system.util.PiiMaskingUtil;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.request.ProductDTO;
import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.repository.ProductRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;

    /**
     * Create a new product in the catalog.
     */
    public ProductResponse createProduct(ProductDTO dto, String adminEmail) {
        // Check for duplicate name + modelNumber
        if (dto.getModelNumber() != null && !dto.getModelNumber().trim().isEmpty()) {
            if (productRepository.existsByNameAndModelNumber(dto.getName(), dto.getModelNumber())) {
                throw new IllegalArgumentException(
                        "Product with name '" + dto.getName() + "' and model number '" + dto.getModelNumber() + "' already exists");
            }
        }

        Product product = new Product();
        product.setName(dto.getName());
        product.setCategory(dto.getCategory());
        product.setDescription(dto.getDescription());
        product.setModelNumber(dto.getModelNumber());
        product.setBrand(dto.getBrand());
        product.setVoltage(dto.getVoltage());
        product.setCapacity(dto.getCapacity());
        product.setChemistry(dto.getChemistry());
        product.setSpecifications(dto.getSpecifications());
        product.setActive(true);
        product.setCreatedByAdminEmail(adminEmail);

        Product saved = productRepository.save(product);
        log.info("Product '{}' created by admin {}", saved.getName(), PiiMaskingUtil.maskEmail(adminEmail));
        return mapToResponse(saved);
    }

    /**
     * Update an existing product.
     */
    public ProductResponse updateProduct(Long id, ProductDTO dto, String adminEmail) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + id));

        if (dto.getName() != null) product.setName(dto.getName());
        if (dto.getCategory() != null) product.setCategory(dto.getCategory());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getModelNumber() != null) product.setModelNumber(dto.getModelNumber());
        if (dto.getBrand() != null) product.setBrand(dto.getBrand());
        if (dto.getVoltage() != null) product.setVoltage(dto.getVoltage());
        if (dto.getCapacity() != null) product.setCapacity(dto.getCapacity());
        if (dto.getChemistry() != null) product.setChemistry(dto.getChemistry());
        if (dto.getSpecifications() != null) product.setSpecifications(dto.getSpecifications());

        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) updated by admin {}", saved.getName(), id, PiiMaskingUtil.maskEmail(adminEmail));
        return mapToResponse(saved);
    }

    /**
     * Get all active products (for dropdown/selection).
     */
    public List<ProductResponse> getAllActiveProducts() {
        return productRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all products including inactive (admin view).
     */
    public List<ProductResponse> getAllProducts() {
        return productRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a single product by ID.
     */
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + id));
        return mapToResponse(product);
    }

    /**
     * Get active products filtered by category.
     */
    public List<ProductResponse> getProductsByCategory(String category) {
        return productRepository.findByCategoryAndActiveTrue(category).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Toggle product active/inactive status (soft delete).
     */
    public ProductResponse toggleProductStatus(Long id, String adminEmail) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + id));

        product.setActive(!product.isActive());
        Product saved = productRepository.save(product);
        log.info("Product '{}' (ID: {}) status toggled to {} by admin {}",
                saved.getName(), id, saved.isActive() ? "ACTIVE" : "INACTIVE", PiiMaskingUtil.maskEmail(adminEmail));
        return mapToResponse(saved);
    }

    // ==================== MAPPER ====================

    private ProductResponse mapToResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setName(product.getName());
        response.setCategory(product.getCategory());
        response.setDescription(product.getDescription());
        response.setModelNumber(product.getModelNumber());
        response.setBrand(product.getBrand());
        response.setVoltage(product.getVoltage());
        response.setCapacity(product.getCapacity());
        response.setChemistry(product.getChemistry());
        response.setSpecifications(product.getSpecifications());
        response.setSpecString(product.buildSpecString());
        response.setActive(product.isActive());
        response.setCreatedByAdminEmail(product.getCreatedByAdminEmail());
        response.setCreatedAt(product.getCreatedAt());
        response.setUpdatedAt(product.getUpdatedAt());
        return response;
    }
}
