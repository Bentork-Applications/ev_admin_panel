package com.bentork.ev_system.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms:604800000}")
    private long expirationMs; // Default 7 days

    // Changed from Key to SecretKey for JJWT 0.12.x compatibility
    private SecretKey key;

    @PostConstruct
    public void init() {
        log.info("Initializing JWT utility with expiration time: {} ms", expirationMs);

        // Ensure the key is generated correctly for HMAC-SHA
        // If your secret is a raw string, we convert it to bytes.
        // For production, ensure the secret string is Base64 encoded and at least 256
        // bits (32 chars).
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(keyBytes);

        log.debug("JWT signing key initialized successfully");
    }

    public String generateToken(UserDetails userDetails) {
        log.debug("Generating JWT token for user: {}", userDetails.getUsername());

        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        log.debug("User authorities: {}", roles);

        String token = Jwts.builder()
                .subject(userDetails.getUsername()) // 'setSubject' is now 'subject'
                .claim("authorities", roles)
                .issuedAt(new Date()) // 'setIssuedAt' is now 'issuedAt'
                .expiration(new Date(System.currentTimeMillis() + expirationMs)) // 'setExpiration' is now 'expiration'
                .signWith(key, Jwts.SIG.HS256) // updated signing method
                .compact();

        log.info("JWT token generated successfully for user: {}", userDetails.getUsername());
        return token;
    }

    public String extractUsername(String token) {
        try {
            String username = Jwts.parser()
                    .verifyWith(key) // 'setSigningKey' is now 'verifyWith'
                    .build()
                    .parseSignedClaims(token) // 'parseClaimsJws' is now 'parseSignedClaims'
                    .getPayload() // 'getBody' is now 'getPayload'
                    .getSubject();

            log.debug("Extracted username from token: {}", username);
            return username;
        } catch (ExpiredJwtException e) {
            log.warn("Attempted to extract username from expired token");
            throw e;
        } catch (JwtException e) {
            log.error("Failed to extract username from token: {}", e.getMessage());
            throw e;
        }
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        log.debug("Validating token for user: {}", userDetails.getUsername());

        try {
            final Claims claims = extractAllClaims(token);
            final String username = claims.getSubject();
            final Date expiration = claims.getExpiration();

            // Check if token is expired
            if (expiration.before(new Date())) {
                log.warn("Token validation failed: Token expired for user: {}", username);
                return false;
            }

            boolean isValid = username.equals(userDetails.getUsername());

            if (isValid) {
                log.debug("Token validated successfully for user: {}", username);
            } else {
                log.warn("Token validation failed: Username mismatch. Token username: {}, Expected: {}",
                        username, userDetails.getUsername());
            }

            return isValid;
        } catch (ExpiredJwtException e) {
            log.warn("Token validation failed: Token expired - {}", e.getMessage());
            return false;
        } catch (MalformedJwtException e) {
            log.error("Token validation failed: Malformed token - {}", e.getMessage());
            return false;
        } catch (SignatureException e) {
            log.error("Token validation failed: Invalid signature - {}", e.getMessage());
            return false;
        } catch (UnsupportedJwtException e) {
            log.error("Token validation failed: Unsupported token - {}", e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            log.error("Token validation failed: Invalid token argument - {}", e.getMessage());
            return false;
        } catch (JwtException e) {
            log.error("Token validation failed: JWT exception - {}", e.getMessage());
            return false;
        }
    }

    // Generic method to extract any claim from token
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        log.trace("Extracting claim from token");
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Extract all claims from token using consistent key
    private Claims extractAllClaims(String token) {
        try {
            log.trace("Parsing JWT token claims");
            return Jwts.parser()
                    .verifyWith(key) // 'setSigningKey' -> 'verifyWith'
                    .build()
                    .parseSignedClaims(token) // 'parseClaimsJws' -> 'parseSignedClaims'
                    .getPayload(); // 'getBody' -> 'getPayload'
        } catch (JwtException e) {
            log.error("Failed to extract claims from token: {}", e.getMessage());
            throw e;
        }
    }
}