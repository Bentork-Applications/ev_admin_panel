package com.bentork.ev_system.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.StationReviewRequest;
import com.bentork.ev_system.dto.response.StationRatingSummary;
import com.bentork.ev_system.dto.response.StationReviewResponse;
import com.bentork.ev_system.mapper.StationReviewMapper;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.model.StationReview;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.StationRepository;
import com.bentork.ev_system.repository.StationReviewRepository;
import com.bentork.ev_system.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Service
@Slf4j
@RequiredArgsConstructor
public class StationReviewService {

    private final StationReviewRepository reviewRepository;

    private final StationRepository stationRepository;

    private final UserRepository userRepository;

    // ========================
    // CREATE REVIEW
    // ========================
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "reviews", allEntries = true),
        @CacheEvict(value = "stations", allEntries = true)
    })
    public StationReviewResponse createReview(Long stationId, Long userId,
            StationReviewRequest request) {

        log.info("Creating review: stationId={}, userId={}, rating={}", stationId, userId, request.getRating());

        // 1. Check if user already reviewed this station
        if (reviewRepository.existsByStationIdAndUserId(stationId, userId)) {
            log.warn("Duplicate review attempt: stationId={}, userId={}", stationId, userId);
            throw new IllegalStateException("You have already reviewed this station");
        }

        // 2. Fetch station and user
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + stationId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with ID: " + userId));

        // 3. Create review entity
        StationReview review = StationReviewMapper.toEntity(request, station, user);
        StationReview savedReview = reviewRepository.save(review);

        log.info("Review created successfully: reviewId={}, stationId={}, userId={}, rating={}",
                savedReview.getId(), stationId, userId, request.getRating());

        return StationReviewMapper.toResponse(savedReview);
    }

    // ========================
    // UPDATE REVIEW
    // ========================
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "reviews", allEntries = true),
        @CacheEvict(value = "stations", allEntries = true)
    })
    public StationReviewResponse updateReview(Long reviewId, Long userId,
            StationReviewRequest request) {

        log.info("Updating review: reviewId={}, userId={}", reviewId, userId);

        StationReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Review not found with ID: " + reviewId));

        // Verify ownership
        if (!review.getUser().getId().equals(userId)) {
            log.warn("Unauthorized review update attempt: reviewId={}, ownerId={}, requesterId={}",
                    reviewId, review.getUser().getId(), userId);
            throw new AccessDeniedException("You can only edit your own reviews");
        }

        // Update fields
        Integer oldRating = review.getRating();
        review.setRating(request.getRating());
        review.setReviewText(request.getReviewText());

        StationReview updated = reviewRepository.save(review);

        log.info("Review updated successfully: reviewId={}, userId={}, ratingChanged={}->{}",
                reviewId, userId, oldRating, request.getRating());

        return StationReviewMapper.toResponse(updated);
    }

    // ========================
    // DELETE REVIEW
    // ========================
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "reviews", allEntries = true),
        @CacheEvict(value = "stations", allEntries = true)
    })
    public void deleteReview(Long reviewId, Long userId) {

        log.info("Deleting review: reviewId={}, userId={}", reviewId, userId);

        StationReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new EntityNotFoundException("Review not found with ID: " + reviewId));

        // Verify ownership
        if (!review.getUser().getId().equals(userId)) {
            log.warn("Unauthorized review delete attempt: reviewId={}, ownerId={}, requesterId={}",
                    reviewId, review.getUser().getId(), userId);
            throw new AccessDeniedException("You can only delete your own reviews");
        }

        reviewRepository.delete(review);
        log.info("Review deleted successfully: reviewId={}, userId={}, stationId={}",
                reviewId, userId, review.getStation().getId());
    }

    // ========================
    // GET REVIEWS BY STATION
    // ========================
    @Cacheable(value = "reviews", key = "'station-' + #stationId")
    public List<StationReviewResponse> getReviewsByStation(Long stationId) {

        log.info("Fetching reviews for station: stationId={}", stationId);

        if (!stationRepository.existsById(stationId)) {
            throw new EntityNotFoundException("Station not found with ID: " + stationId);
        }

        List<StationReviewResponse> reviews = reviewRepository
                .findByStationIdOrderByCreatedAtDesc(stationId).stream()
                .map(StationReviewMapper::toResponse)
                .collect(Collectors.toList());

        log.info("Found {} reviews for stationId={}", reviews.size(), stationId);
        return reviews;
    }

    // ========================
    // GET REVIEWS BY USER
    // ========================
    @Cacheable(value = "reviews", key = "'user-' + #userId")
    public List<StationReviewResponse> getReviewsByUser(Long userId) {

        log.info("Fetching reviews by user: userId={}", userId);

        List<StationReviewResponse> reviews = reviewRepository
                .findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(StationReviewMapper::toResponse)
                .collect(Collectors.toList());

        log.info("Found {} reviews by userId={}", reviews.size(), userId);
        return reviews;
    }

    // ========================
    // GET STATION RATING SUMMARY
    // ========================
    @Cacheable(value = "reviews", key = "'summary-' + #stationId")
    public StationRatingSummary getStationRatingSummary(Long stationId) {

        log.info("Fetching rating summary for station: stationId={}", stationId);

        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new EntityNotFoundException("Station not found with ID: " + stationId));

        Double avgRating = reviewRepository.findAverageRatingByStationId(stationId);
        Long totalReviews = reviewRepository.countByStationId(stationId);

        // Build rating distribution {1: count, 2: count, ...5: count}
        List<StationReview> reviews = reviewRepository.findByStationIdOrderByCreatedAtDesc(stationId);
        Map<Integer, Long> distribution = reviews.stream()
                .collect(Collectors.groupingBy(StationReview::getRating, Collectors.counting()));

        StationRatingSummary summary = new StationRatingSummary();
        summary.setStationId(stationId);
        summary.setStationName(station.getName());
        summary.setAverageRating(avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        summary.setTotalReviews(totalReviews != null ? totalReviews : 0L);
        summary.setRatingDistribution(distribution);

        log.info("Rating summary for stationId={}: avg={}, total={}",
                stationId, summary.getAverageRating(), summary.getTotalReviews());

        return summary;
    }

    // ========================
    // GET USER'S REVIEW FOR A STATION
    // ========================
    @Cacheable(value = "reviews", key = "'station-' + #stationId + '-user-' + #userId")
    public StationReviewResponse getUserReviewForStation(Long stationId, Long userId) {

        log.info("Fetching user review: stationId={}, userId={}", stationId, userId);

        StationReview review = reviewRepository.findByStationIdAndUserId(stationId, userId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No review found for station " + stationId + " by user " + userId));

        return StationReviewMapper.toResponse(review);
    }
}
