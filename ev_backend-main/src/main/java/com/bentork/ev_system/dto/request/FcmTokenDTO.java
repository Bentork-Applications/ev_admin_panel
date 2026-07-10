package com.bentork.ev_system.dto.request;

public class FcmTokenDTO {

    private String fcmToken;

    // Default Constructor
    public FcmTokenDTO() {
    }

    // Constructor
    public FcmTokenDTO(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    // Getter
    public String getFcmToken() {
        return fcmToken;
    }

    // Setter
    public void setFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }
}