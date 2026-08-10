package com.bentork.ev_system.service;

import com.bentork.ev_system.config.JwtUtil;
import com.bentork.ev_system.dto.request.AdminLoginRequest;
import com.bentork.ev_system.dto.request.AdminSignupRequest;
import com.bentork.ev_system.dto.request.JwtResponse;
import com.bentork.ev_system.dto.request.UpdateRoleRequest;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.service.interfaces.IAdminAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuthService implements IAdminAuthService {

    private final AdminRepository adminRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final OtpDeliveryService otpDeliveryService;

    @Override
    public String register(AdminSignupRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword()))
            throw new IllegalArgumentException("Passwords do not match");
        if (adminRepo.existsByEmail(request.getEmail()))
            throw new IllegalArgumentException("Email already in use");

        Admin admin = new Admin();
        admin.setName(request.getName());
        admin.setEmail(request.getEmail());
        admin.setPassword(passwordEncoder.encode(request.getPassword()));
        
        adminRepo.save(admin);

        return "Admin registered successfully";
    }

    @Override
    public JwtResponse login(AdminLoginRequest request) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmailOrMobile(), request.getPassword()));
        String token = jwtUtil.generateToken((UserDetails) auth.getPrincipal());
        return new JwtResponse(token);
    }

    @Override
    public List<Admin> getAllAdmins() {
        return adminRepo.findByActiveTrue();
    }

    @Override
    public String updateRole(UpdateRoleRequest request) {
        Admin adminToUpdate = adminRepo.findById(request.getAdminId())
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        adminToUpdate.setRole(request.getRole());
        adminRepo.save(adminToUpdate);
        return "Role updated to " + request.getRole() + " for " + String.valueOf(request.getAdminId());
    }

    @Override
    public void sendOtp(String email) {
        if (!adminRepo.existsByEmail(email)) {
            throw new RuntimeException("Email not registered");
        }
        String otp = otpService.generateOtp(email);
        otpDeliveryService.sendOtp(email, otp);
    }

    @Override
    public void resetPassword(String email, String otp, String newPassword) {
        if (!otpService.validateOtp(email, otp)) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }
        Admin admin = adminRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("Admin not found"));
        admin.setPassword(passwordEncoder.encode(newPassword));
        adminRepo.save(admin);
        otpService.clearOtp(email);
    }

    @Override
    public void deactivateAdmin(Long id) {
        Admin admin = adminRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Admin not found with ID: " + id));
        admin.setActive(false);
        adminRepo.save(admin);
    }

    @Override
    public void reactivateAdmin(Long id) {
        Admin admin = adminRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Admin not found with ID: " + id));
        admin.setActive(true);
        adminRepo.save(admin);
    }
}