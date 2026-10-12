package com.bentork.ev_system.dto.request;

import java.time.LocalDate;


public class BatteryDataDTO {

    private String customerName;
    private Long productId; // Optional: select from product catalog
    private String productDetails;
    private String invoiceNumber;
    private String barcode;

    // Optional: for bulk barcode series expansion
    private String startBarcode;
    private String endBarcode;

    // Full Warranty (Replacement)
    private LocalDate warrantyStartDate;
    private LocalDate warrantyEndDate;

    // Service Warranty (Repair/Servicing) — optional
    private LocalDate serviceWarrantyStartDate;
    private LocalDate serviceWarrantyEndDate;


    private String address;

    // Getters and Setters

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductDetails() {
        return productDetails;
    }

    public void setProductDetails(String productDetails) {
        this.productDetails = productDetails;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getStartBarcode() {
        return startBarcode;
    }

    public void setStartBarcode(String startBarcode) {
        this.startBarcode = startBarcode;
    }

    public String getEndBarcode() {
        return endBarcode;
    }

    public void setEndBarcode(String endBarcode) {
        this.endBarcode = endBarcode;
    }

    public LocalDate getWarrantyStartDate() {
        return warrantyStartDate;
    }

    public void setWarrantyStartDate(LocalDate warrantyStartDate) {
        this.warrantyStartDate = warrantyStartDate;
    }

    public LocalDate getWarrantyEndDate() {
        return warrantyEndDate;
    }

    public void setWarrantyEndDate(LocalDate warrantyEndDate) {
        this.warrantyEndDate = warrantyEndDate;
    }

    public LocalDate getServiceWarrantyStartDate() {
        return serviceWarrantyStartDate;
    }

    public void setServiceWarrantyStartDate(LocalDate serviceWarrantyStartDate) {
        this.serviceWarrantyStartDate = serviceWarrantyStartDate;
    }

    public LocalDate getServiceWarrantyEndDate() {
        return serviceWarrantyEndDate;
    }

    public void setServiceWarrantyEndDate(LocalDate serviceWarrantyEndDate) {
        this.serviceWarrantyEndDate = serviceWarrantyEndDate;
    }


    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
