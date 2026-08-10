package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Request DTO for updating an admin's role
 */
public class UpdateRoleRequest {

    @NotNull(message = "Admin ID is required")
    private Long adminId;

    @NotNull(message = "Role is required")
    @Pattern(regexp = "^(ADMIN|DEALER|ADMIN_STAFF|SALES_ADMIN|PRODUCTION_ADMIN|SCM_ADMIN)$", message = "Role must be ADMIN, DEALER, ADMIN_STAFF, SALES_ADMIN, PRODUCTION_ADMIN, or SCM_ADMIN")
    private String role;

    // Default constructor
    public UpdateRoleRequest() {
    }

    // All-args constructor
    public UpdateRoleRequest(Long adminId, String role) {
        this.adminId = adminId;
        this.role = role;
    }

    // Getters and Setters

    public Long getAdminId() {
        return adminId;
    }

    public void setAdminId(Long adminId) {
        this.adminId = adminId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
