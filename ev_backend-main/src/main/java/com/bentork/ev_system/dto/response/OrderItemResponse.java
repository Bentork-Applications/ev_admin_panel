package com.bentork.ev_system.dto.response;

import java.util.List;

public class OrderItemResponse {

    private Long id;
    private String productDetails;
    private Integer quantity;
    private Integer serviceWarrantyMonths;
    private Integer fullWarrantyMonths;
    private Integer totalWarrantyMonths;
    private List<String> barcodes;

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public List<String> getBarcodes() {
        return barcodes;
    }

    public void setBarcodes(List<String> barcodes) {
        this.barcodes = barcodes;
    }
}
