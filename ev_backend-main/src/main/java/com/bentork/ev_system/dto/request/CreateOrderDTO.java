package com.bentork.ev_system.dto.request;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class CreateOrderDTO {

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Assigned User ID is required")
    private Long assignedUserId;

    @NotBlank(message = "P.I. Number is required")
    private String piNumber;

    // ==================== PRODUCT ITEMS (replaces flat productDetails/quantity) ====================

    @NotEmpty(message = "At least one product item is required")
    @Valid
    private List<OrderItemDTO> orderItems;

    @NotBlank(message = "Mobile number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Mobile number must be 10 digits")
    private String mobileNumber;

    @NotNull(message = "Expected delivery date is required")
    private String expectedDeliveryDate; // ISO date format: yyyy-MM-dd

    @NotNull(message = "Total invoice amount is required")
    @DecimalMin(value = "0.01", message = "Total invoice amount must be greater than zero")
    private Double totalInvoiceAmount;

    @DecimalMin(value = "0.0", message = "Received amount cannot be negative")
    private Double receivedAmount = 0.0;

    @NotBlank(message = "Priority is required")
    @Pattern(regexp = "^(low|medium|high)$", message = "Priority must be 'low', 'medium', or 'high'")
    private String priority;

    // Getters and Setters

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Long getAssignedUserId() {
        return assignedUserId;
    }

    public void setAssignedUserId(Long assignedUserId) {
        this.assignedUserId = assignedUserId;
    }

    public String getPiNumber() {
        return piNumber;
    }

    public void setPiNumber(String piNumber) {
        this.piNumber = piNumber;
    }

    public List<OrderItemDTO> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItemDTO> orderItems) {
        this.orderItems = orderItems;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getExpectedDeliveryDate() {
        return expectedDeliveryDate;
    }

    public void setExpectedDeliveryDate(String expectedDeliveryDate) {
        this.expectedDeliveryDate = expectedDeliveryDate;
    }

    public Double getTotalInvoiceAmount() {
        return totalInvoiceAmount;
    }

    public void setTotalInvoiceAmount(Double totalInvoiceAmount) {
        this.totalInvoiceAmount = totalInvoiceAmount;
    }

    public Double getReceivedAmount() {
        return receivedAmount;
    }

    public void setReceivedAmount(Double receivedAmount) {
        this.receivedAmount = receivedAmount;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
}
