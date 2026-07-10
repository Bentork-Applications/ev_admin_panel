package com.bentork.ev_system.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    /**
     * Sends a standard push notification with a Title and Body.
     *
     * @param token The FCM device token of the user.
     * @param title The title of the notification (e.g., "Charging Complete").
     * @param body  The message content (e.g., "Your vehicle has reached 100%").
     */
    public void sendNotification(String token, String title, String body) {
        if (token == null || token.isEmpty()) {
            log.warn("Cannot send notification: FCM Token is null or empty.");
            return;
        }

        try {
            // Build the Notification payload (visible to user)
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // Build the Message wrapper
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .build();

            // Send via Firebase
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Notification sent successfully. Response ID: {}", response);

        } catch (FirebaseMessagingException e) {
            log.error("Failed to send Firebase notification: {}", e.getMessage());
        }
    }

    /**
     * Sends a notification that includes hidden data payload (useful for app
     * navigation).
     *
     * @param token The FCM device token.
     * @param title The title.
     * @param body  The body.
     * @param data  Map of key-value pairs (e.g., {"chargerId": "123", "sessionId":
     *              "456"}).
     */
    public void sendNotificationWithData(String token, String title, String body, Map<String, String> data) {
        if (token == null || token.isEmpty()) {
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message.Builder messageBuilder = Message.builder()
                    .setToken(token)
                    .setNotification(notification);

            // Add custom data if present
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            log.info("Data Notification sent successfully. Response ID: {}", response);

        } catch (FirebaseMessagingException e) {
            log.error("Failed to send Data Notification: {}", e.getMessage());
        }
    }

    /**
     * Sends a data-only FCM message (no Notification wrapper).
     * This bypasses the OS notification tray and is delivered directly
     * to the app's background message handler (Headless JS / onMessage).
     * Used for real-time session progress bar updates and session completion events.
     * Uses HIGH priority on Android to wake the app from Doze.
     *
     * @param token The FCM device token of the user.
     * @param data  Map of key-value pairs (e.g., {"type": "SESSION_UPDATE", "progress": "65"}).
     */
    public void sendDataOnlyNotification(String token, Map<String, String> data) {
        if (token == null || token.isEmpty()) {
            log.warn("Cannot send data-only notification: FCM Token is null or empty.");
            return;
        }
        try {
            Message message = Message.builder()
                    .setToken(token)
                    .putAllData(data)
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Data-only notification sent successfully. Response ID: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send data-only notification: {}", e.getMessage());
        }
    }
}