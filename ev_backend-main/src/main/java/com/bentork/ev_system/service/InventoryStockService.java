package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.bentork.ev_system.dto.response.InventoryStockResponseDTO;
import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.repository.ProductRepository;
import com.bentork.ev_system.repository.StockLedgerRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventoryStockService {

    private final StockLedgerRepository stockLedgerRepository;
    private final ProductRepository productRepository;

    public Integer getAvailableStock(Long productId) {
        return stockLedgerRepository.getAvailableStockByProductId(productId);
    }
    
    public List<InventoryStockResponseDTO> getAllStocks() {
        return productRepository.findAll().stream()
                .map(product -> {
                    Integer availableStock = getAvailableStock(product.getId());
                    
                    ProductResponse productResponse = new ProductResponse();
                    productResponse.setId(product.getId());
                    productResponse.setName(product.getName());
                    productResponse.setCategory(product.getCategory());
                    productResponse.setBrand(product.getBrand());
                    
                    return new InventoryStockResponseDTO(productResponse, availableStock);
                })
                .collect(Collectors.toList());
    }
    
    public InventoryStockResponseDTO getStockOverview(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found with id: " + productId));
        
        Integer availableStock = getAvailableStock(productId);
        
        ProductResponse productResponse = new ProductResponse();
        productResponse.setId(product.getId());
        productResponse.setName(product.getName());
        productResponse.setCategory(product.getCategory());
        productResponse.setBrand(product.getBrand());
        
        return new InventoryStockResponseDTO(productResponse, availableStock);
    }
}
