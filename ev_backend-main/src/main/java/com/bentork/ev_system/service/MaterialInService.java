package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.MaterialInItemRequestDTO;
import com.bentork.ev_system.dto.request.MaterialInRequestDTO;
import com.bentork.ev_system.dto.response.MaterialInResponseDTO;
import com.bentork.ev_system.enums.PurchaseOrderStatus;
import com.bentork.ev_system.enums.StockTransactionType;
import com.bentork.ev_system.model.MaterialIn;
import com.bentork.ev_system.model.PurchaseOrder;
import com.bentork.ev_system.model.PurchaseOrderItem;
import com.bentork.ev_system.model.StockLedger;
import com.bentork.ev_system.repository.MaterialInRepository;
import com.bentork.ev_system.repository.PurchaseOrderItemRepository;
import com.bentork.ev_system.repository.PurchaseOrderRepository;
import com.bentork.ev_system.repository.StockLedgerRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaterialInService {

    private final MaterialInRepository materialInRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final StockLedgerRepository stockLedgerRepository;

    @Transactional
    public MaterialInResponseDTO processMaterialIn(MaterialInRequestDTO dto, String receivedByEmail) {
        PurchaseOrder po = purchaseOrderRepository.findById(dto.getPurchaseOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Purchase Order not found with id: " + dto.getPurchaseOrderId()));
        
        if (po.getStatus() != PurchaseOrderStatus.APPROVED && po.getStatus() != PurchaseOrderStatus.PARTIALLY_FULFILLED) {
            throw new IllegalArgumentException("Cannot receive materials for a PO with status: " + po.getStatus());
        }

        MaterialIn materialIn = new MaterialIn();
        materialIn.setReceiptNumber("MIN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        materialIn.setPurchaseOrder(po);
        materialIn.setVendorInvoiceNumber(dto.getVendorInvoiceNumber());
        materialIn.setReceivedDate(LocalDate.now());
        materialIn.setReceivedByEmail(receivedByEmail);
        materialIn.setNotes(dto.getNotes());
        
        MaterialIn savedMaterialIn = materialInRepository.save(materialIn);
        
        boolean allItemsFulfilled = true;

        for (MaterialInItemRequestDTO itemDto : dto.getItems()) {
            PurchaseOrderItem poItem = purchaseOrderItemRepository.findById(itemDto.getPoItemId())
                    .orElseThrow(() -> new IllegalArgumentException("PO Item not found with id: " + itemDto.getPoItemId()));
            
            if (!poItem.getPurchaseOrder().getId().equals(po.getId())) {
                throw new IllegalArgumentException("PO Item does not belong to the specified Purchase Order");
            }

            int remainingQty = poItem.getQuantity() - poItem.getReceivedQuantity();
            if (itemDto.getReceivedQuantity() > remainingQty) {
                throw new IllegalArgumentException("Cannot receive more than ordered for item id: " + poItem.getId());
            }

            // Update PO Item received quantity
            poItem.setReceivedQuantity(poItem.getReceivedQuantity() + itemDto.getReceivedQuantity());
            purchaseOrderItemRepository.save(poItem);
            
            if (poItem.getReceivedQuantity() < poItem.getQuantity()) {
                allItemsFulfilled = false;
            }

            // Create Stock Ledger entry
            StockLedger ledgerEntry = new StockLedger();
            ledgerEntry.setProduct(poItem.getProduct());
            ledgerEntry.setTransactionType(StockTransactionType.IN);
            ledgerEntry.setQuantity(itemDto.getReceivedQuantity());
            ledgerEntry.setReferenceId(savedMaterialIn.getReceiptNumber());
            ledgerEntry.setTransactionDate(LocalDateTime.now());
            ledgerEntry.setCreatedByEmail(receivedByEmail);
            stockLedgerRepository.save(ledgerEntry);
        }
        
        // Update PO Status
        po.setStatus(allItemsFulfilled ? PurchaseOrderStatus.FULFILLED : PurchaseOrderStatus.PARTIALLY_FULFILLED);
        purchaseOrderRepository.save(po);

        return mapToResponse(savedMaterialIn);
    }
    
    public List<MaterialInResponseDTO> getAllMaterialIns() {
        return materialInRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private MaterialInResponseDTO mapToResponse(MaterialIn materialIn) {
        MaterialInResponseDTO dto = new MaterialInResponseDTO();
        dto.setId(materialIn.getId());
        dto.setReceiptNumber(materialIn.getReceiptNumber());
        dto.setPurchaseOrderId(materialIn.getPurchaseOrder().getId());
        dto.setPoNumber(materialIn.getPurchaseOrder().getPoNumber());
        dto.setVendorInvoiceNumber(materialIn.getVendorInvoiceNumber());
        dto.setReceivedDate(materialIn.getReceivedDate());
        dto.setReceivedByEmail(materialIn.getReceivedByEmail());
        dto.setNotes(materialIn.getNotes());
        dto.setCreatedAt(materialIn.getCreatedAt());
        return dto;
    }
}
