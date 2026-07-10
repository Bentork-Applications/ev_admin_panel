package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.StationReviewRequest;
import com.bentork.ev_system.dto.response.StationRatingSummary;
import com.bentork.ev_system.dto.response.StationReviewResponse;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.StationReviewService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/station-reviews")
@Slf4j
public class StationReviewController {
    private final StationReviewService reviewService;
        private final UserRepository userRepository;

    // ========================
    // CREATE REVIEW
    // ========================
    @PostMapping("/{stationId}")
    public ResponseEntity<?> createReview(
            @PathVariable Long stationId,
            @RequestBody @Valid StationReviewRequest request,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("POST /api/station-reviews/{} - Creating review, rating={}", stationId, request.getRating());

        try {
            Long userId = extractUserId(userDetails);
            StationReviewResponse response = reviewService.createReview(stationId, userId, request);
            log.info("POST /api/station-reviews/{} - Success, reviewId={}", stationId, response.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalStateException e) {
            log.warn("POST /api/station-reviews/{} - Duplicate review: {}", stationId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            log.error("POST /api/station-reviews/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to create review");
        }
    }

    // ========================
    // UPDATE REVIEW
    // ========================
    @PutMapping("/{reviewId}")
    public ResponseEntity<?> updateReview(
            @PathVariable Long reviewId,
            @RequestBody @Valid StationReviewRequest request,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("PUT /api/station-reviews/{} - Updating review", reviewId);

        try {
            Long userId = extractUserId(userDetails);
            StationReviewResponse response = reviewService.updateReview(reviewId, userId, request);
            log.info("PUT /api/station-reviews/{} - Success", reviewId);
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            log.warn("PUT /api/station-reviews/{} - Forbidden: {}", reviewId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            log.error("PUT /api/station-reviews/{} - Failed: {}", reviewId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update review");
        }
    }

    // ========================
    // DELETE REVIEW
    // ========================
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("DELETE /api/station-reviews/{} - Request received", reviewId);

        try {
            Long userId = extractUserId(userDetails);
            reviewService.deleteReview(reviewId, userId);
            log.info("DELETE /api/station-reviews/{} - Success", reviewId);
            return ResponseEntity.ok("Review deleted successfully");
        } catch (org.springframework.security.access.AccessDeniedException e) {
            log.warn("DELETE /api/station-reviews/{} - Forbidden: {}", reviewId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            log.error("DELETE /api/station-reviews/{} - Failed: {}", reviewId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete review");
        }
    }

    // ========================
    // GET ALL REVIEWS FOR A STATION
    // ========================
    @GetMapping("/station/{stationId}")
    public ResponseEntity<?> getReviewsByStation(@PathVariable Long stationId) {

        log.info("GET /api/station-reviews/station/{} - Request received", stationId);

        try {
            List<StationReviewResponse> reviews = reviewService.getReviewsByStation(stationId);
            log.info("GET /api/station-reviews/station/{} - Success, count={}", stationId, reviews.size());
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            log.error("GET /api/station-reviews/station/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================
    // GET ALL REVIEWS BY A USER
    // ========================
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getReviewsByUser(@PathVariable Long userId) {

        log.info("GET /api/station-reviews/user/{} - Request received", userId);

        try {
            List<StationReviewResponse> reviews = reviewService.getReviewsByUser(userId);
            log.info("GET /api/station-reviews/user/{} - Success, count={}", userId, reviews.size());
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            log.error("GET /api/station-reviews/user/{} - Failed: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================
    // GET STATION RATING SUMMARY
    // ========================
    @GetMapping("/summary/{stationId}")
    public ResponseEntity<?> getRatingSummary(@PathVariable Long stationId) {

        log.info("GET /api/station-reviews/summary/{} - Request received", stationId);

        try {
            StationRatingSummary summary = reviewService.getStationRatingSummary(stationId);
            log.info("GET /api/station-reviews/summary/{} - Success, avg={}, total={}",
                    stationId, summary.getAverageRating(), summary.getTotalReviews());
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("GET /api/station-reviews/summary/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================
    // GET CURRENT USER'S REVIEW FOR A STATION
    // ========================
    @GetMapping("/my-review/{stationId}")
    public ResponseEntity<?> getMyReview(
            @PathVariable Long stationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/station-reviews/my-review/{} - Request received", stationId);

        try {
            Long userId = extractUserId(userDetails);
            StationReviewResponse review = reviewService.getUserReviewForStation(stationId, userId);
            log.info("GET /api/station-reviews/my-review/{} - Success, reviewId={}", stationId, review.getId());
            return ResponseEntity.ok(review);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.info("GET /api/station-reviews/my-review/{} - No review found", stationId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("GET /api/station-reviews/my-review/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================
    // HELPER: Extract userId from JWT
    // ========================
    private Long extractUserId(org.springframework.security.core.userdetails.UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
