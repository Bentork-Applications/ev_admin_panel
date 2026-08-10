package com.bentork.ev_system.mapper;

import com.bentork.ev_system.dto.request.StationReviewRequest;
import com.bentork.ev_system.dto.response.StationReviewResponse;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.model.StationReview;
import com.bentork.ev_system.model.User;

public class StationReviewMapper {

    public static StationReviewResponse toResponse(StationReview review) {
        StationReviewResponse dto = new StationReviewResponse();
        dto.setId(review.getId());
        dto.setStationId(review.getStation().getId());
        dto.setStationName(review.getStation().getName());
        dto.setUserId(review.getUser().getId());
        dto.setUserName(review.getUser().getName());
        dto.setUserImageUrl(review.getUser().getImageUrl());
        dto.setRating(review.getRating());
        dto.setReviewText(review.getReviewText());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedAt(review.getUpdatedAt());
        return dto;
    }

    public static StationReview toEntity(StationReviewRequest request, Station station, User user) {
        StationReview review = new StationReview();
        review.setStation(station);
        review.setUser(user);
        review.setRating(request.getRating());
        review.setReviewText(request.getReviewText());
        return review;
    }
}
