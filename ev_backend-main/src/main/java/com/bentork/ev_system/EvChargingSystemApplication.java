package com.bentork.ev_system;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@SpringBootApplication
@EnableScheduling
public class EvChargingSystemApplication {

    public static void main(String[] args) {
        // 1. Load .env file (if it exists)
        // This configuration prevents crashing if the file is missing
        Dotenv dotenv = Dotenv.configure()
                .directory("./")
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load();

        // 2.SAFE SETTING: Only set system property if the value exists in .env
        // On AWS, these will be skipped (which is good!)
        safeSetProperty(dotenv, "GOOGLE_CLIENT_ID");
        safeSetProperty(dotenv, "GOOGLE_CLIENT_SECRET");
        safeSetProperty(dotenv, "RAZORPAY_KEY_ID");
        safeSetProperty(dotenv, "RAZORPAY_KEY_SECRET");
        safeSetProperty(dotenv, "GOOGLE_MAPS_API_KEY");
        safeSetProperty(dotenv, "TRUECALLER_CLIENT_ID");
        safeSetProperty(dotenv, "TRUECALLER_WEB_CLIENT_ID");
        safeSetProperty(dotenv, "REDIS_HOST");
        safeSetProperty(dotenv, "REDIS_PORT");
        safeSetProperty(dotenv, "REDIS_PASSWORD");

        SpringApplication.run(EvChargingSystemApplication.class, args);
    }

    // Helper method to stop the NullPointerException
    private static void safeSetProperty(Dotenv dotenv, String key) {
        String value = dotenv.get(key);
        if (value != null && !value.isEmpty()) {
            System.setProperty(key, value);
        }
    }

    @PostConstruct
    public void init() {
        // Setting Spring Boot SetTimeZone
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
        log.info("Application running in IST timezone: {}", new java.util.Date());
    }
}