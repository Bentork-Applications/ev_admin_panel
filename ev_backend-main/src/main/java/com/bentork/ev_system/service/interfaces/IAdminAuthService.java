package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.AdminLoginRequest;
import com.bentork.ev_system.dto.request.AdminSignupRequest;
import com.bentork.ev_system.dto.request.JwtResponse;
import com.bentork.ev_system.model.Admin;

import java.util.List;

public interface IAdminAuthService {
    String register(AdminSignupRequest request);
    JwtResponse login(AdminLoginRequest request);
    List<Admin> getAllAdmins();
    String updateRole(com.bentork.ev_system.dto.request.UpdateRoleRequest request);
    void sendOtp(String email);
    void resetPassword(String email, String otp, String newPassword);
    void deactivateAdmin(Long id);
    void reactivateAdmin(Long id);
}