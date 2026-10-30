package com.bentork.ev_system.dto.request;

public class FcmTokenDTO {

    private String fcmToken;

    /** Defaults to true since registering a token is an explicit opt-in action. */
    private boolean consentToPushNotifications = true;

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

    public boolean isConsentToPushNotifications() {
        return consentToPushNotifications;
    }

    public void setConsentToPushNotifications(boolean consentToPushNotifications) {
        this.consentToPushNotifications = consentToPushNotifications;
    }
}