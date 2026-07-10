package com.bentork.ev_system.dto.request;

import java.time.LocalDate;

public class BatteryDataDTO {

    private String customerName;
    private String productDetails;
    private String invoiceNumber;
    private String barcode;
    private String productSerialNumber;

    // Optional: for series expansion
    private String startSeriesNumber;
    private String endSeriesNumber;

    private LocalDate warrantyStartDate;
    private LocalDate warrantyEndDate;

    // Getters and Setters

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
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

    public String getProductSerialNumber() {
        return productSerialNumber;
    }

    public void setProductSerialNumber(String productSerialNumber) {
        this.productSerialNumber = productSerialNumber;
    }

    public String getStartSeriesNumber() {
        return startSeriesNumber;
    }

    public void setStartSeriesNumber(String startSeriesNumber) {
        this.startSeriesNumber = startSeriesNumber;
    }

    public String getEndSeriesNumber() {
        return endSeriesNumber;
    }

    public void setEndSeriesNumber(String endSeriesNumber) {
        this.endSeriesNumber = endSeriesNumber;
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
}
