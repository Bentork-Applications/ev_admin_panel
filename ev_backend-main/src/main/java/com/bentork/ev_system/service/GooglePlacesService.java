package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.response.CafeResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class GooglePlacesService {

    private static final String NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";

    private static final String FIELD_MASK = "places.displayName,places.formattedAddress,"
            + "places.location,places.rating,places.currentOpeningHours,places.googleMapsUri,places.primaryType";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.maps.api.key:}")
    private String apiKey;

    public GooglePlacesService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Fetches nearby cafes from Google Places API (Nearby Search - New).
     *
     * @param latitude  Center latitude
     * @param longitude Center longitude
     * @param radius    Search radius in meters (max 50000)
     * @return List of CafeResponseDTO
     */
    public List<CafeResponseDTO> findNearbyCafes(double latitude, double longitude, double radius) {
        log.info("GooglePlacesService - Finding nearby cafes: lat={}, lng={}, radius={}m",
                latitude, longitude, radius);

        if (apiKey == null || apiKey.isBlank()) {
            log.error("GooglePlacesService - GOOGLE_MAPS_API_KEY is not configured!");
            throw new RuntimeException("Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY.");
        }

        List<CafeResponseDTO> cafes = new ArrayList<>();

        try {
            // Build request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Goog-Api-Key", apiKey);
            headers.set("X-Goog-FieldMask", FIELD_MASK);

            // Build request body
            String requestBody = buildRequestBody(latitude, longitude, radius);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            log.info("GooglePlacesService - Sending request to Google Places API");

            // Make API call
            ResponseEntity<String> response = restTemplate.exchange(
                    NEARBY_SEARCH_URL,
                    HttpMethod.POST,
                    entity,
                    String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                cafes = parseResponse(response.getBody());
                log.info("GooglePlacesService - Successfully fetched {} cafes", cafes.size());
            } else {
                log.warn("GooglePlacesService - Unexpected response status: {}", response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("GooglePlacesService - Failed to fetch cafes from Google Places API: {}",
                    e.getMessage(), e);
            throw new RuntimeException("Failed to fetch nearby cafes from Google Places API", e);
        }

        return cafes;
    }

    /**
     * Builds the JSON request body for the Nearby Search API.
     */
    private String buildRequestBody(double latitude, double longitude, double radius) {
        return """
                {
                  "includedTypes": ["cafe", "restaurant", "shopping_mall"],
                  "maxResultCount": 10,
                  "locationRestriction": {
                    "circle": {
                      "center": {
                        "latitude": %s,
                        "longitude": %s
                      },
                      "radius": %s
                    }
                  }
                }
                """.formatted(latitude, longitude, radius);
    }

    /**
     * Parses the Google Places API JSON response into a list of CafeResponseDTO.
     */
    private List<CafeResponseDTO> parseResponse(String responseBody) {
        List<CafeResponseDTO> cafes = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode places = root.path("places");

            if (places.isMissingNode() || !places.isArray()) {
                log.info("GooglePlacesService - No cafes found in response");
                return cafes;
            }

            for (JsonNode place : places) {
                CafeResponseDTO cafe = new CafeResponseDTO();

                // Name
                JsonNode displayName = place.path("displayName");
                if (!displayName.isMissingNode()) {
                    cafe.setName(displayName.path("text").asText(null));
                }

                // Address
                cafe.setAddress(place.path("formattedAddress").asText(null));

                // Location (lat/lng)
                JsonNode location = place.path("location");
                if (!location.isMissingNode()) {
                    cafe.setLatitude(location.path("latitude").asDouble());
                    cafe.setLongitude(location.path("longitude").asDouble());
                }

                // Rating
                if (!place.path("rating").isMissingNode()) {
                    cafe.setRating(place.path("rating").asDouble());
                }

                // Open Now
                JsonNode openingHours = place.path("currentOpeningHours");
                if (!openingHours.isMissingNode()) {
                    cafe.setOpenNow(openingHours.path("openNow").asBoolean(false));
                }

                // Google Maps URI
                cafe.setGoogleMapsUri(place.path("googleMapsUri").asText(null));

                // Category
                JsonNode primaryType = place.path("primaryType");
                if (!primaryType.isMissingNode()) {
                    String type = primaryType.asText("");
                    if ("shopping_mall".equals(type)) {
                        cafe.setCategory("mall");
                    } else if ("restaurant".equals(type)) {
                        cafe.setCategory("restaurant");
                    } else if ("cafe".equals(type)) {
                        cafe.setCategory("cafe");
                    } else {
                        cafe.setCategory(type);
                    }
                }

                cafes.add(cafe);
            }

        } catch (Exception e) {
            log.error("GooglePlacesService - Error parsing response: {}", e.getMessage(), e);
        }

        return cafes;
    }
}
