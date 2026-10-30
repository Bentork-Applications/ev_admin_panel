package com.bentork.ev_system.config;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepo;

    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String imageUrl = oAuth2User.getAttribute("picture");

        Optional<User> optionalUser = userRepo.findByEmail(email);
        User user = optionalUser.orElseGet(() -> {
            User newUser = new User();
            newUser.setName(name);
            newUser.setEmail(email);
            newUser.setPassword("");
            newUser.setImageUrl(imageUrl);

            try {
                return userRepo.save(newUser);
            } catch (Exception e) {
                throw new RuntimeException("Error saving new user: " + e.getMessage(), e);
            }
        });

        // Update profile picture if user exists but image changed
        if (optionalUser.isPresent() && imageUrl != null) {
            User existingUser = optionalUser.get();
            if (!imageUrl.equals(existingUser.getImageUrl())) {
                existingUser.setImageUrl(imageUrl);
                user = userRepo.save(existingUser);
            }
        }

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(), "", Collections.emptyList());

        String token = jwtUtil.generateToken(userDetails);

        String redirectUrl = "https://web.bentork.in/login?token=" + token;

        String ocppId = (String) request.getSession().getAttribute("ocppId");
        if (ocppId != null) {
            redirectUrl += "&ocppId=" + ocppId;
        }

        response.sendRedirect(redirectUrl);
    }
}
