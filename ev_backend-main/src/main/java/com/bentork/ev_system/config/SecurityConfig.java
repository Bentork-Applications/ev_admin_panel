package com.bentork.ev_system.config;

import com.bentork.ev_system.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        private final CustomUserDetailsService userDetailsService;

        private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
                return authConfig.getAuthenticationManager();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public DaoAuthenticationProvider daoAuthenticationProvider() {
                DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
                provider.setUserDetailsService(userDetailsService);
                provider.setPasswordEncoder(passwordEncoder());
                return provider;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> {
                                }) // Enable CORS support
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(jwtAuthenticationEntryPoint) // Use custom
                                                                                                       // entry point
                                )
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                "/api/user/signup",
                                                                "/api/user/login",
                                                                "/api/user/truecaller-login",
                                                                "/api/user/truecaller/webhook",
                                                                "/api/user/truecaller/status/**",
                                                                "/api/admin/signup",
                                                                "/api/admin/login",
                                                                "/api/user/request-otp",
                                                                "/api/user/reset-password",
                                                                "/api/admin/request-otp",
                                                                "/api/admin/reset-password",
                                                                "/oauth2/**",
                                                                "/login/**",
                                                                "/api/user/google-login-success",
                                                                "/api/user/byemail/**",
                                                                "/error",
                                                                "/favicon.ico")
                                                .permitAll()

                                                // ===== GUEST MODE: Read-only public endpoints =====
                                                // Stations — Guest can browse, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/stations/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/stations/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/stations/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/stations/**")
                                                .hasAuthority("ADMIN")

                                                // Chargers — Guest can browse, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/chargers/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/chargers/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/chargers/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/chargers/**")
                                                .hasAuthority("ADMIN")

                                                // Locations — Guest can browse, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/location/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/location/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/location/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/location/**")
                                                .hasAuthority("ADMIN")

                                                // Plans — Guest can browse, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/plans/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/plans/**").hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/plans/**").hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/plans/**")
                                                .hasAuthority("ADMIN")

                                                // Emergency Contacts — Guest can read, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/emergency-contacts/**")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/emergency-contacts/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/emergency-contacts/**")
                                                .hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/emergency-contacts/**")
                                                .hasAuthority("ADMIN")

                                                // Cafes — Guest can browse nearby/details, only ADMIN can modify
                                                .requestMatchers(HttpMethod.GET, "/api/cafes/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/cafes/**").hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.PUT, "/api/cafes/**").hasAuthority("ADMIN")
                                                .requestMatchers(HttpMethod.DELETE, "/api/cafes/**").hasAuthority("ADMIN")

                                                // Station Reviews — Guest can read reviews & summaries, login required to write
                                                .requestMatchers(HttpMethod.GET, "/api/station-reviews/**").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/station-reviews/**").authenticated()
                                                .requestMatchers(HttpMethod.PUT, "/api/station-reviews/**").authenticated()
                                                .requestMatchers(HttpMethod.DELETE, "/api/station-reviews/**").authenticated()

                                                // Slots — Guest can view available slots for a charger
                                                .requestMatchers(HttpMethod.GET, "/api/slots/charger/*/available").permitAll()

                                                // User Plan Selection — already public
                                                .requestMatchers("/api/user-plan-selection/**").permitAll()

                                                // ===== PROTECTED: Login required =====
                                                // Admin-only endpoints
                                                .requestMatchers("/api/revenue/**").hasAuthority("ADMIN")

                                                // Dealer station management (Admin only)
                                                .requestMatchers("/api/dealer-stations/**").hasAuthority("ADMIN")

                                                // Dealer endpoints (Dealer can access their own data)
                                                .requestMatchers("/api/dealer/**").hasAuthority("DEALER")

                                                // Sessions — login required (user identity needed for billing)
                                                .requestMatchers("/api/sessions/**").authenticated()
                                                .requestMatchers("/api/user/charger/**").authenticated()
                                                .requestMatchers("/api/user/plans/**").authenticated()

                                                // Wallet — login required (financial data)
                                                .requestMatchers("/api/wallet/**").authenticated()

                                                // Coins & Referrals — login required (user-specific rewards)
                                                .requestMatchers("/api/coins/**").authenticated()
                                                .requestMatchers("/api/referral/**").authenticated()

                                                // Battery Data - Admin & Staff manage, Users can search
                                                .requestMatchers("/api/battery-data/admin/**").hasAnyAuthority("ADMIN", "ADMIN_STAFF")
                                                .requestMatchers("/api/battery-data/user/**").hasAuthority("ROLE_USER")

                                                // Warranty Claims - role-specific access
                                                .requestMatchers("/api/warranty-claims/user/**").hasAuthority("ROLE_USER")
                                                .requestMatchers("/api/warranty-claims/admin/**").hasAnyAuthority("ADMIN", "ADMIN_STAFF")

                                                // Support Requests - role-specific access
                                                .requestMatchers("/api/support-requests/user/**").hasAuthority("ROLE_USER")
                                                .requestMatchers("/api/support-requests/dealer/**").hasAuthority("DEALER")
                                                .requestMatchers("/api/support-requests/admin/**").hasAuthority("ADMIN")

                                                // Order Tracking - role-specific access
                                                .requestMatchers("/api/orders/user/**").hasAuthority("ROLE_USER")
                                                .requestMatchers("/api/orders/admin/**").hasAnyAuthority("ADMIN", "ADMIN_STAFF")

                                                // Everything else requires login
                                                .anyRequest().authenticated())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authenticationProvider(daoAuthenticationProvider())
                                .oauth2Login(oauth -> oauth
                                                .successHandler(oAuth2AuthenticationSuccessHandler))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}
