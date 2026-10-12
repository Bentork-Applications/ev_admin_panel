package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.PurchaseOrderItemRequestDTO;
import com.bentork.ev_system.dto.request.PurchaseOrderRequestDTO;
import com.bentork.ev_system.dto.response.ProductResponse;
import com.bentork.ev_system.dto.response.PurchaseOrderItemResponseDTO;
import com.bentork.ev_system.dto.response.PurchaseOrderResponseDTO;
import com.bentork.ev_system.enums.PurchaseOrderStatus;
import com.bentork.ev_system.model.Product;
import com.bentork.ev_system.model.PurchaseOrder;
import com.bentork.ev_system.model.PurchaseOrderItem;
import com.bentork.ev_system.model.Vendor;
import com.bentork.ev_system.repository.ProductRepository;
import com.bentork.ev_system.repository.PurchaseOrderRepository;
import com.bentork.ev_system.repository.VendorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final VendorService vendorService;

    @Transactional
    public PurchaseOrderResponseDTO createPurchaseOrder(PurchaseOrderRequestDTO dto, String createdByEmail) {
        Vendor vendor = vendorRepository.findById(dto.getVendorId())
                .orElseThrow(() -> new IllegalArgumentException("Vendor not found with id: " + dto.getVendorId()));

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        po.setVendor(vendor);
        po.setExpectedDeliveryDate(dto.getExpectedDeliveryDate());
        po.setDeliveryLocation(dto.getDeliveryLocation());
        po.setTermsAndConditions(dto.getTermsAndConditions());
        po.setCreatedByEmail(createdByEmail);
        po.setStatus(PurchaseOrderStatus.DRAFT);

        for (PurchaseOrderItemRequestDTO itemDto : dto.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with id: " + itemDto.getProductId()));
            
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(po);
            item.setProduct(product);
            item.setQuantity(itemDto.getQuantity());
            
            po.getOrderItems().add(item);
        }

        PurchaseOrder savedPo = purchaseOrderRepository.save(po);
        return mapToResponse(savedPo);
    }

    public List<PurchaseOrderResponseDTO> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PurchaseOrderResponseDTO> getPurchaseOrdersByVendorId(Long vendorId) {
        return purchaseOrderRepository.findByVendorId(vendorId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public PurchaseOrderResponseDTO getPurchaseOrderById(Long id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with id: " + id));
        return mapToResponse(po);
    }

    @Transactional
    public PurchaseOrderResponseDTO approvePurchaseOrder(Long id, String approvedByEmail) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with id: " + id));
        
        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new IllegalArgumentException("Only DRAFT purchase orders can be approved");
        }
        
        po.setStatus(PurchaseOrderStatus.APPROVED);
        po.setApprovedByEmail(approvedByEmail);
        
        PurchaseOrder savedPo = purchaseOrderRepository.save(po);
        return mapToResponse(savedPo);
    }

    public PurchaseOrderResponseDTO mapToResponse(PurchaseOrder po) {
        PurchaseOrderResponseDTO dto = new PurchaseOrderResponseDTO();
        dto.setId(po.getId());
        dto.setPoNumber(po.getPoNumber());
        dto.setVendor(vendorService.mapToResponse(po.getVendor()));
        dto.setStatus(po.getStatus().getValue());
        dto.setExpectedDeliveryDate(po.getExpectedDeliveryDate());
        dto.setDeliveryLocation(po.getDeliveryLocation());
        dto.setTermsAndConditions(po.getTermsAndConditions());
        dto.setCreatedByEmail(po.getCreatedByEmail());
        dto.setApprovedByEmail(po.getApprovedByEmail());
        dto.setCreatedAt(po.getCreatedAt());
        
        List<PurchaseOrderItemResponseDTO> items = po.getOrderItems().stream().map(item -> {
            PurchaseOrderItemResponseDTO itemDto = new PurchaseOrderItemResponseDTO();
            itemDto.setId(item.getId());
            itemDto.setQuantity(item.getQuantity());
            itemDto.setReceivedQuantity(item.getReceivedQuantity());
            
            // Map product - simpler representation
            ProductResponse productResponse = new ProductResponse();
            productResponse.setId(item.getProduct().getId());
            productResponse.setName(item.getProduct().getName());
            productResponse.setCategory(item.getProduct().getCategory());
            productResponse.setBrand(item.getProduct().getBrand());
            itemDto.setProduct(productResponse);
            
            return itemDto;
        }).collect(Collectors.toList());
        
        dto.setItems(items);
        return dto;
    }
}
