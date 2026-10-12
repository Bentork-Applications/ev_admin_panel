package com.bentork.ev_system.dto.request;

import jakarta.validation.constraints.NotBlank;

public class UserLoginRequest {

    @NotBlank(message = "Email or mobile number is required")
    private String emailOrMobile;

    @NotBlank(message = "Password is required")
    private String password;

    // Getters
    public String getEmailOrMobile() {
        return emailOrMobile;
    }

    public String getPassword() {
        return password;
    }

    // Setters
    public void setEmailOrMobile(String emailOrMobile) {
        this.emailOrMobile = emailOrMobile;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
