package com.bentork.ev_system.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * IP-based rate limiter for unauthenticated (guest) requests.
 * Protects public endpoints from abuse/scraping.
 *
 * - If a valid Authorization header is present, the request is NOT rate-limited.
 * - If no Authorization header, the request counts towards the IP's rate limit.
 * - Returns 429 Too Many Requests with a JSON body when the limit is exceeded.
 * - Counters reset every 60 seconds via a scheduled task.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, AtomicInteger> requestCounts = new ConcurrentHashMap<>();

    @Value("${rate.limit.requests-per-minute:60}")
    private int maxRequestsPerMinute;

    @Value("${rate.limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Skip rate limiting if disabled
        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip rate limiting for authenticated requests (those with a Bearer token)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Get client IP (supports proxied requests)
        String clientIp = getClientIp(request);

        // Increment and check counter
        AtomicInteger counter = requestCounts.computeIfAbsent(clientIp, k -> new AtomicInteger(0));
        int currentCount = counter.incrementAndGet();

        if (currentCount > maxRequestsPerMinute) {
            log.warn("Rate limit exceeded for IP: {} ({} requests/min)", clientIp, currentCount);

            response.setStatus(429); // 429 Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"RATE_LIMIT_EXCEEDED\","
                    + "\"message\":\"Too many requests. Please try again later or login for unlimited access.\"}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Reset all IP counters every 60 seconds.
     */
    @Scheduled(fixedRate = 60000)
    public void resetCounters() {
        if (!requestCounts.isEmpty()) {
            log.debug("Resetting rate limit counters for {} IPs", requestCounts.size());
            requestCounts.clear();
        }
    }

    /**
     * Extract client IP, accounting for reverse proxies (X-Forwarded-For).
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For may contain multiple IPs: client, proxy1, proxy2
            // The first one is the original client IP
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
