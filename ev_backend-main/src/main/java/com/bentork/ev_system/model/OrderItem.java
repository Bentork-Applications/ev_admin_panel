package com.bentork.ev_system.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private Order order;

    @Column(nullable = false)
    private String productDetails;

    @Column(nullable = false)
    private Integer quantity;

    // ==================== WARRANTY FIELDS (set during SCM stage) ====================

    private Integer serviceWarrantyMonths;

    private Integer fullWarrantyMonths;

    private Integer totalWarrantyMonths;

    // Comma-separated barcodes assigned to this item during SCM stage
    private String barcodes;

    // ==================== CONSTRUCTORS ====================

    public OrderItem() {
    }

    public OrderItem(Order order, String productDetails, Integer quantity) {
        this.order = order;
        this.productDetails = productDetails;
        this.quantity = quantity;
    }

    // ==================== GETTERS AND SETTERS ====================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public String getProductDetails() {
        return productDetails;
    }

    public void setProductDetails(String productDetails) {
        this.productDetails = productDetails;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getServiceWarrantyMonths() {
        return serviceWarrantyMonths;
    }

    public void setServiceWarrantyMonths(Integer serviceWarrantyMonths) {
        this.serviceWarrantyMonths = serviceWarrantyMonths;
    }

    public Integer getFullWarrantyMonths() {
        return fullWarrantyMonths;
    }

    public void setFullWarrantyMonths(Integer fullWarrantyMonths) {
        this.fullWarrantyMonths = fullWarrantyMonths;
    }

    public Integer getTotalWarrantyMonths() {
        return totalWarrantyMonths;
    }

    public void setTotalWarrantyMonths(Integer totalWarrantyMonths) {
        this.totalWarrantyMonths = totalWarrantyMonths;
    }

    public String getBarcodes() {
        return barcodes;
    }

    public void setBarcodes(String barcodes) {
        this.barcodes = barcodes;
    }
}
