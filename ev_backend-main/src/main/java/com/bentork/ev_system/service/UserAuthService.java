package com.bentork.ev_system.service;

import com.bentork.ev_system.config.JwtUtil;
import com.bentork.ev_system.dto.request.JwtResponse;
import com.bentork.ev_system.dto.request.UserLoginRequest;
import com.bentork.ev_system.dto.request.UserSignupRequest;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import com.bentork.ev_system.service.interfaces.IUserAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAuthService implements IUserAuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final OtpDeliveryService otpDeliveryService;
    private final IAdminNotificationService adminNotificationService;

    @Override
    @CacheEvict(value = "user-data", allEntries = true)
    public String register(UserSignupRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword()))
            throw new IllegalArgumentException("Passwords do not match");
        if (userRepo.existsByEmail(request.getEmail()))
            throw new IllegalArgumentException("Email already in use");

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setMobile(request.getMobile());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepo.save(user);

        adminNotificationService.notifyNewUserRegistration(user.getName());
        return "User registered successfully";
    }

    @Override
    public JwtResponse login(UserLoginRequest request) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmailOrMobile(), request.getPassword()));
        String token = jwtUtil.generateToken((UserDetails) auth.getPrincipal());
        return new JwtResponse(token);
    }

    @Override
    public void sendOtp(String email) {
        if (!userRepo.existsByEmail(email)) {
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
        User user = userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);
        otpService.clearOtp(email);
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public JwtResponse googleLogin(String email) {
        User user = userRepo.findByEmail(email).orElseGet(() -> {
            log.info("New Google user detected, auto-registering: {}", email);
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(email.split("@")[0]); // default name from email prefix
            // password left null — valid for Google-only login (see User.java line 28)
            userRepo.save(newUser);
            adminNotificationService.notifyNewUserRegistration(newUser.getName());
            return newUser;
        });
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password("")
                .authorities("USER")
                .build();
        return new JwtResponse(jwtUtil.generateToken(userDetails));
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void deleteAccount(String email) {
        User user = userRepo.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        userRepo.save(user);
    }

    @Override
    @Cacheable(value = "dashboard-stats", key = "'total-users'")
    public long getTotalUsers() {
        return userRepo.countByActiveTrue();
    }

    @Override
    @Cacheable(value = "user-data", key = "#email")
    public User getUserDetailsByEmail(String email) throws Exception {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new Exception("User with email '" + email + "' not found."));
    }

    @Override
    @Cacheable(value = "user-data", key = "'all-users'")
    public List<User> getAllUsers() {
        return userRepo.findByActiveTrue();
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void deactivateUser(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        userRepo.save(user);
    }

    @Override
    @CacheEvict(value = {"user-data", "dashboard-stats"}, allEntries = true)
    public void reactivateUser(Long id) {
        User user = userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(true);
        userRepo.save(user);
    }

    @Override
    @Cacheable(value = "user-data", key = "#id")
    public User getUserById(Long id) throws Exception {
        return userRepo.findById(id).orElseThrow(() -> new Exception("User not found"));
    }
}