package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.MaterialOutRequestDTO;
import com.bentork.ev_system.dto.response.MaterialOutResponseDTO;
import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.enums.StockTransactionType;
import com.bentork.ev_system.model.MaterialOut;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.model.StockLedger;
import com.bentork.ev_system.repository.MaterialOutRepository;
import com.bentork.ev_system.repository.ProductRepository;
import com.bentork.ev_system.repository.StockLedgerRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaterialOutService {

    private final MaterialOutRepository materialOutRepository;
    private final ProductRepository productRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final InventoryStockService inventoryStockService;

    @Transactional
    public MaterialOutResponseDTO processMaterialOut(MaterialOutRequestDTO dto, String issuedByEmail) {
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found with id: " + dto.getProductId()));
        
        Integer availableStock = inventoryStockService.getAvailableStock(product.getId());
        if (dto.getQuantity() > availableStock) {
            throw new IllegalArgumentException("Insufficient stock. Available: " + availableStock + ", Requested: " + dto.getQuantity());
        }

        MaterialOut materialOut = new MaterialOut();
        materialOut.setIssueNumber("MOUT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        materialOut.setProduct(product);
        materialOut.setQuantity(dto.getQuantity());
        materialOut.setPurpose(dto.getPurpose());
        materialOut.setIssuedTo(dto.getIssuedTo());
        materialOut.setIssuedByEmail(issuedByEmail);
        materialOut.setIssueDate(LocalDate.now());
        materialOut.setNotes(dto.getNotes());
        
        MaterialOut savedMaterialOut = materialOutRepository.save(materialOut);
        
        // Create Stock Ledger entry
        StockLedger ledgerEntry = new StockLedger();
        ledgerEntry.setProduct(product);
        ledgerEntry.setTransactionType(StockTransactionType.OUT);
        ledgerEntry.setQuantity(dto.getQuantity());
        ledgerEntry.setReferenceId(savedMaterialOut.getIssueNumber());
        ledgerEntry.setTransactionDate(LocalDateTime.now());
        ledgerEntry.setCreatedByEmail(issuedByEmail);
        stockLedgerRepository.save(ledgerEntry);

        return mapToResponse(savedMaterialOut);
    }
    
    public List<MaterialOutResponseDTO> getAllMaterialOuts() {
        return materialOutRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private MaterialOutResponseDTO mapToResponse(MaterialOut materialOut) {
        MaterialOutResponseDTO dto = new MaterialOutResponseDTO();
        dto.setId(materialOut.getId());
        dto.setIssueNumber(materialOut.getIssueNumber());
        
        ProductResponse productResponse = new ProductResponse();
        productResponse.setId(materialOut.getProduct().getId());
        productResponse.setName(materialOut.getProduct().getName());
        productResponse.setCategory(materialOut.getProduct().getCategory());
        productResponse.setBrand(materialOut.getProduct().getBrand());
        dto.setProduct(productResponse);
        
        dto.setQuantity(materialOut.getQuantity());
        dto.setPurpose(materialOut.getPurpose());
        dto.setIssuedTo(materialOut.getIssuedTo());
        dto.setIssuedByEmail(materialOut.getIssuedByEmail());
        dto.setIssueDate(materialOut.getIssueDate());
        dto.setNotes(materialOut.getNotes());
        dto.setCreatedAt(materialOut.getCreatedAt());
        return dto;
    }
}
