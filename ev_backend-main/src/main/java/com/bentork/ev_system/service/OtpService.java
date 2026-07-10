package com.bentork.ev_system.service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class OtpService {

    private final Map<String, String> otpCache = new ConcurrentHashMap<>(); // email -> otp
    private final Map<String, String> otpToEmailMap = new ConcurrentHashMap<>(); // otp -> email

    public String generateOtp(String email) {
        String otp = String.format("%04d", new Random().nextInt(10000));
        otpCache.put(email, otp);
        otpToEmailMap.put(otp, email);
        return otp;
    }

    public boolean validateOtp(String email, String otp) {
        return otp.equals(otpCache.get(email));
    }

    public String getEmailByOtp(String otp) {
        return otpToEmailMap.get(otp);
    }

    public void clearOtp(String email) {
        String otp = otpCache.remove(email);
        if (otp != null) {
            otpToEmailMap.remove(otp);
        }
    }
}
