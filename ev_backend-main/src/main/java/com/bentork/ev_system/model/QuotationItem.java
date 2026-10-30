package com.bentork.ev_system.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Represents a line item within a {@link Quotation}.
 * 
 * References the existing {@link Product} catalog via productId.
 * The productDescription field is a snapshot of the product name at quote time,
 * ensuring the quote remains accurate even if the product catalog changes later.
 */
@Entity
@Table(name = "quotation_items", indexes = {
        @Index(name = "idx_quotation_item_quotation", columnList = "quotation_id"),
        @Index(name = "idx_quotation_item_product", columnList = "productId")
})
@Getter
@Setter
public class QuotationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    private Long productId; // FK to existing products table

    @Column(nullable = false)
    private String productDescription; // Snapshot of product info at quote time

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double unitPrice;

    @Column(nullable = false)
    private Double totalPrice; // quantity * unitPrice
}
