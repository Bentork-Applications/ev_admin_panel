package com.bentork.ev_system.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import javax.annotation.PostConstruct;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.service-account.path}")
    private Resource serviceAccountResource;

    @Bean
    public FirebaseApp firebaseApp() {
        // Prevent re-initialization error during hot-reloads or tests
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        // Gracefully skip Firebase if credentials file is missing
        if (!serviceAccountResource.exists()) {
            log.warn("⚠ Firebase service account file not found: {}. "
                    + "Firebase features (push notifications) will be DISABLED. "
                    + "Place the file in src/main/resources/ to enable.",
                    serviceAccountResource);
            return null;
        }

        try {
            log.info("Initializing Firebase Admin SDK...");

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccountResource.getInputStream()))
                    .build();

            FirebaseApp app = FirebaseApp.initializeApp(options);
            log.info("Firebase Application '{}' initialized successfully.", app.getName());
            return app;
        } catch (IOException e) {
            log.error("Failed to initialize Firebase: {}. Push notifications will be DISABLED.", e.getMessage());
            return null;
        }
    }
}