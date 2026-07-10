package com.bentork.ev_system.service;

import com.bentork.ev_system.config.JwtUtil;
import com.bentork.ev_system.dto.request.TruecallerLoginRequest;
import com.bentork.ev_system.dto.response.TruecallerLoginResponse;
import com.bentork.ev_system.dto.response.TruecallerUserInfo;
import com.bentork.ev_system.dto.request.TruecallerWebhookPayload;
import com.bentork.ev_system.dto.response.TruecallerStatusResponse;
import com.bentork.ev_system.model.TruecallerLoginSession;
import com.bentork.ev_system.repository.TruecallerLoginSessionRepository;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TruecallerAuthService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepo;
    private final JwtUtil jwtUtil;
    private final IAdminNotificationService adminNotificationService;
    private final TruecallerLoginSessionRepository sessionRepo;

    @Value("${truecaller.client-id:}")
    private String clientId;

    @Value("${truecaller.web.client-id:}")
    private String webClientId;

    @Value("${truecaller.token-url:https://oauth-account-noneu.truecaller.com/v1/token}")
    private String tokenUrl;

    @Value("${truecaller.userinfo-url:https://oauth-account-noneu.truecaller.com/v1/userinfo}")
    private String userinfoUrl;

    /**
     * Full Truecaller login flow:
     * 1. Exchange authorization code for access token
     * 2. Fetch user profile from Truecaller
     * 3. Find or create user in database
     * 4. Generate and return JWT
     */
    public TruecallerLoginResponse login(TruecallerLoginRequest request) {
        log.info("Processing Truecaller login request");

        // Step 1: Exchange authorization code for access token
        String accessToken = exchangeCodeForAccessToken(
                request.getAuthorizationCode(),
                request.getCodeVerifier(),
                request.getClientType()
        );

        // Step 2: Fetch user profile from Truecaller
        TruecallerUserInfo userInfo = fetchUserProfile(accessToken);
        log.info("Truecaller profile fetched for phone: {}",
                maskPhoneNumber(userInfo.getPhoneNumber()));

        // Step 3: Find or create user
        boolean isNewUser = false;
        String normalizedMobile = normalizePhoneNumber(userInfo.getPhoneNumber());

        Optional<User> existingUser = userRepo.findByMobile(normalizedMobile);
        User user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
            log.info("Existing user found by mobile for Truecaller login: {}", user.getEmail());

            // Update profile picture if changed
            if (userInfo.getPicture() != null && !userInfo.getPicture().equals(user.getImageUrl())) {
                user.setImageUrl(userInfo.getPicture());
                user = userRepo.save(user);
            }
        } else {
            // Check if user exists by email from Truecaller profile
            Optional<User> existingUserByEmail = Optional.empty();
            if (userInfo.getEmail() != null && !userInfo.getEmail().isBlank()) {
                existingUserByEmail = userRepo.findByEmail(userInfo.getEmail());
            }

            if (existingUserByEmail.isPresent()) {
                // Link Truecaller phone number to the existing Google account
                user = existingUserByEmail.get();
                log.info("Existing user found by email; linking Truecaller phone: {}", normalizedMobile);
                user.setMobile(normalizedMobile);
                if (userInfo.getPicture() != null) {
                    user.setImageUrl(userInfo.getPicture());
                }
                user = userRepo.save(user);
            } else {
                // Auto-register new user if neither mobile nor email exists
                user = createUserFromTruecaller(userInfo, normalizedMobile);
                isNewUser = true;
                log.info("New user auto-registered via Truecaller: {}", normalizedMobile);

                // Notify admin of new registration
                adminNotificationService.notifyNewUserRegistration(user.getName());
            }
        }

        // Step 4: Generate JWT
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail() != null ? user.getEmail() : normalizedMobile)
                .password("")
                .authorities("ROLE_USER")
                .build();

        String jwtToken = jwtUtil.generateToken(userDetails);

        return TruecallerLoginResponse.builder()
                .token(jwtToken)
                .newUser(isNewUser)
                .name(user.getName())
                .mobile(user.getMobile())
                .email(user.getEmail())
                .imageUrl(user.getImageUrl())
                .build();
    }

    /**
     * Exchange the authorization code and code verifier for an access token
     * using Truecaller's OAuth2 PKCE token endpoint.
     */
    private String exchangeCodeForAccessToken(String authorizationCode, String codeVerifier, String clientType) {
        log.debug("Exchanging authorization code for access token");

        String activeClientId = "WEB".equalsIgnoreCase(clientType) ? webClientId : clientId;

        if (activeClientId == null || activeClientId.trim().isEmpty()) {
            log.error("Truecaller Client ID is not configured for client type: {}", clientType != null ? clientType : "MOBILE");
            throw new RuntimeException("Server misconfiguration: Truecaller Client ID is missing.");
        }

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", activeClientId);
        params.add("code", authorizationCode);
        params.add("code_verifier", codeVerifier);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(params, headers);

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, requestEntity, Map.class);

            if (response.getBody() == null || !response.getBody().containsKey("access_token")) {
                log.error("Truecaller token response missing access_token");
                throw new RuntimeException("Failed to obtain access token from Truecaller");
            }

            String accessToken = (String) response.getBody().get("access_token");
            log.debug("Access token obtained successfully from Truecaller");
            return accessToken;

        } catch (HttpClientErrorException e) {
            log.error("Truecaller token exchange failed: {} - {}",
                    e.getStatusCode(), e.getResponseBodyAsString());

            if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                throw new RuntimeException(
                        "Invalid or expired authorization code. Please try logging in again.");
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                throw new RuntimeException(
                        "Too many login attempts. Please try again later.");
            }
            throw new RuntimeException("Truecaller authentication failed: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error during Truecaller token exchange: {}", e.getMessage(), e);
            throw new RuntimeException("Truecaller authentication failed: " + e.getMessage());
        }
    }

    /**
     * Fetch user profile information from Truecaller using the access token.
     */
    private TruecallerUserInfo fetchUserProfile(String accessToken) {
        log.debug("Fetching user profile from Truecaller");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        try {
            ResponseEntity<TruecallerUserInfo> response = restTemplate.exchange(
                    userinfoUrl,
                    HttpMethod.GET,
                    requestEntity,
                    TruecallerUserInfo.class
            );

            if (response.getBody() == null || response.getBody().getPhoneNumber() == null) {
                log.error("Truecaller profile response missing phone number");
                throw new RuntimeException(
                        "Failed to retrieve phone number from Truecaller profile");
            }

            return response.getBody();

        } catch (HttpClientErrorException e) {
            log.error("Truecaller profile fetch failed: {} - {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("Failed to fetch Truecaller profile: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error fetching Truecaller profile: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch Truecaller profile: " + e.getMessage());
        }
    }

    /**
     * Create a new User entity from Truecaller profile data.
     */
    private User createUserFromTruecaller(TruecallerUserInfo userInfo, String normalizedMobile) {
        User newUser = new User();
        newUser.setName(userInfo.getFullName());
        newUser.setMobile(normalizedMobile);
        newUser.setPassword(""); // No password for social login users
        newUser.setImageUrl(userInfo.getPicture());

        // Set email if provided by Truecaller
        if (userInfo.getEmail() != null && !userInfo.getEmail().isBlank()) {
            // Only set email if it's not already taken by another user
            if (!userRepo.existsByEmail(userInfo.getEmail())) {
                newUser.setEmail(userInfo.getEmail());
            } else {
                log.warn("Email {} from Truecaller already exists in DB, skipping email assignment",
                        userInfo.getEmail());
            }
        }

        return userRepo.save(newUser);
    }

    /**
     * Normalize phone number by removing '+' prefix.
     * Truecaller returns phone numbers like "+919876543210".
     * We store them without the '+' prefix (e.g., "919876543210" or "9876543210").
     */
    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }
        // Remove '+' prefix if present
        String normalized = phoneNumber.startsWith("+") ? phoneNumber.substring(1) : phoneNumber;

        // If the number starts with country code "91" and is 12 digits, extract last 10
        if (normalized.startsWith("91") && normalized.length() == 12) {
            normalized = normalized.substring(2);
        }

        return normalized;
    }

    /**
     * Mask phone number for logging (show only last 4 digits).
     */
    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return "****" + phoneNumber.substring(phoneNumber.length() - 4);
    }

    public void handleWebhook(TruecallerWebhookPayload payload) {
        log.info("Processing Truecaller webhook for requestId: {}", payload.getRequestId());
        
        TruecallerLoginSession session = sessionRepo.findByRequestId(payload.getRequestId())
                .orElse(new TruecallerLoginSession(payload.getRequestId()));
        
        try {
            TruecallerUserInfo userInfo;
            String providedPhone = payload.getPhoneNumber() != null ? payload.getPhoneNumber() : payload.getPhonenumber();
            if (payload.getAccessToken() != null && !payload.getAccessToken().isEmpty()) {
                userInfo = fetchUserProfile(payload.getAccessToken());
            } else if (providedPhone != null) {
                userInfo = new TruecallerUserInfo();
                userInfo.setPhoneNumber(providedPhone);
                // For simplicity, we just set name if provided directly
            } else {
                throw new RuntimeException("Invalid webhook payload: missing token or phone number");
            }

            String normalizedMobile = normalizePhoneNumber(userInfo.getPhoneNumber());
            Optional<User> existingUser = userRepo.findByMobile(normalizedMobile);
            User user;

            if (existingUser.isPresent()) {
                user = existingUser.get();
            } else {
                Optional<User> existingUserByEmail = Optional.empty();
                if (userInfo.getEmail() != null && !userInfo.getEmail().isBlank()) {
                    existingUserByEmail = userRepo.findByEmail(userInfo.getEmail());
                }
                
                if (existingUserByEmail.isPresent()) {
                    user = existingUserByEmail.get();
                    log.info("Webhook: Existing user found by email; linking Truecaller phone: {}", normalizedMobile);
                    user.setMobile(normalizedMobile);
                    if (userInfo.getPicture() != null) {
                        user.setImageUrl(userInfo.getPicture());
                    }
                    user = userRepo.save(user);
                } else {
                    user = createUserFromTruecaller(userInfo, normalizedMobile);
                    adminNotificationService.notifyNewUserRegistration(user.getName());
                }
            }

            UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                    .username(user.getEmail() != null ? user.getEmail() : normalizedMobile)
                    .password("")
                    .authorities("ROLE_USER")
                    .build();

            String jwtToken = jwtUtil.generateToken(userDetails);
            
            session.setJwtToken(jwtToken);
            session.setStatus("SUCCESS");
            
        } catch (Exception e) {
            log.error("Webhook processing failed: {}", e.getMessage());
            session.setStatus("FAILED");
        }
        
        sessionRepo.save(session);
    }
    
    public TruecallerStatusResponse getLoginStatus(String requestId) {
        return sessionRepo.findByRequestId(requestId)
                .map(session -> new TruecallerStatusResponse(session.getStatus(), session.getJwtToken()))
                .orElse(new TruecallerStatusResponse("PENDING", null));
    }
}
