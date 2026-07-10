package com.bentork.ev_system.service.interfaces;

import com.bentork.ev_system.dto.request.JwtResponse;
import com.bentork.ev_system.dto.request.UserLoginRequest;
import com.bentork.ev_system.dto.request.UserSignupRequest;
import com.bentork.ev_system.model.User;

import java.util.List;

public interface IUserAuthService {
    String register(UserSignupRequest request);
    JwtResponse login(UserLoginRequest request);
    void sendOtp(String email);
    void resetPassword(String email, String otp, String newPassword);
    JwtResponse googleLogin(String email);
    void deleteAccount(String email);
    long getTotalUsers();
    User getUserDetailsByEmail(String email) throws Exception;
    List<User> getAllUsers();
    User getUserById(Long id) throws Exception;
    void deactivateUser(Long id);
    void reactivateUser(Long id);
}