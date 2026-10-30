package com.bentork.ev_system.controller;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.SlotBookingDTO;
import com.bentork.ev_system.exception.SlotAlreadyBookedException;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.SlotBookingService;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/slot-bookings")
public class SlotBookingController {
    private final SlotBookingService slotBookingService;
        private final UserRepository userRepository;

    /**
     * Book a slot.
     * The user is identified from the JWT token.
     */
    @PostMapping("/book/{slotId}")
    public ResponseEntity<?> bookSlot(
            @PathVariable Long slotId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("POST /api/slot-bookings/book/{} - Booking slot", slotId);

        try {
            User user = extractUser(userDetails);

            SlotBookingDTO booking = slotBookingService.bookSlot(user.getId(), slotId);

            log.info("POST /api/slot-bookings/book/{} - Success, bookingId={}, userId={}",
                    slotId, booking.getId(), user.getId());

            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (SlotAlreadyBookedException e) {
            log.warn("POST /api/slot-bookings/book/{} - Slot already booked: {}", slotId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("POST /api/slot-bookings/book/{} - Bad request: {}", slotId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("POST /api/slot-bookings/book/{} - Failed: {}", slotId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/slot-bookings/book/{} - Failed: {}", slotId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to book slot"));
        }
    }

    /**
     * Cancel a booking.
     * Only the booking owner can cancel.
     */
    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("PUT /api/slot-bookings/{}/cancel - Cancelling booking", bookingId);

        try {
            User user = extractUser(userDetails);

            SlotBookingDTO cancelled = slotBookingService.cancelBooking(bookingId, user.getId());

            log.info("PUT /api/slot-bookings/{}/cancel - Success, userId={}",
                    bookingId, user.getId());

            return ResponseEntity.ok(cancelled);
        } catch (IllegalStateException e) {
            log.warn("PUT /api/slot-bookings/{}/cancel - Cannot cancel: {}", bookingId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("PUT /api/slot-bookings/{}/cancel - Failed: {}", bookingId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("PUT /api/slot-bookings/{}/cancel - Failed: {}", bookingId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to cancel booking"));
        }
    }

    /**
     * Get all bookings for the authenticated user.
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/slot-bookings/my-bookings - Fetching user bookings");

        try {
            User user = extractUser(userDetails);

            List<SlotBookingDTO> bookings = slotBookingService.getBookingsByUser(user.getId());

            log.info("GET /api/slot-bookings/my-bookings - Success, {} bookings found for userId={}",
                    bookings.size(), user.getId());

            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            log.error("GET /api/slot-bookings/my-bookings - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch bookings"));
        }
    }

    /**
     * Get active (status = "booked") bookings for the authenticated user.
     */
    @GetMapping("/my-bookings/active")
    public ResponseEntity<?> getMyActiveBookings(
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/slot-bookings/my-bookings/active - Fetching active bookings");

        try {
            User user = extractUser(userDetails);

            List<SlotBookingDTO> bookings = slotBookingService.getActiveBookingsByUser(user.getId());

            log.info("GET /api/slot-bookings/my-bookings/active - Success, {} active bookings for userId={}",
                    bookings.size(), user.getId());

            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            log.error("GET /api/slot-bookings/my-bookings/active - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch active bookings"));
        }
    }

    /**
     * Get a single booking by ID.
     */
    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getBookingById(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/slot-bookings/{} - Fetching booking details", bookingId);

        try {
            SlotBookingDTO booking = slotBookingService.getBookingById(bookingId);

            log.info("GET /api/slot-bookings/{} - Success", bookingId);
            return ResponseEntity.ok(booking);
        } catch (RuntimeException e) {
            log.error("GET /api/slot-bookings/{} - Failed: {}", bookingId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GET /api/slot-bookings/{} - Failed: {}", bookingId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch booking"));
        }
    }

    /**
     * Get all bookings for a station (Admin view).
     */
    @GetMapping("/station/{stationId}")
    public ResponseEntity<?> getBookingsByStation(
            @PathVariable Long stationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/slot-bookings/station/{} - Fetching station bookings", stationId);

        try {
            List<SlotBookingDTO> bookings = slotBookingService.getBookingsByStation(stationId);

            log.info("GET /api/slot-bookings/station/{} - Success, {} bookings found",
                    stationId, bookings.size());

            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            log.error("GET /api/slot-bookings/station/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch station bookings"));
        }
    }

    /**
     * Get all bookings for a user by userId (Admin view).
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBookingsByUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        log.info("GET /api/slot-bookings/user/{} - Fetching user bookings", userId);

        try {
            List<SlotBookingDTO> bookings = slotBookingService.getBookingsByUser(userId);

            log.info("GET /api/slot-bookings/user/{} - Success, {} bookings found",
                    userId, bookings.size());

            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            log.error("GET /api/slot-bookings/user/{} - Failed: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch user bookings"));
        }
    }

    // ---- Helper ----

    private User extractUser(org.springframework.security.core.userdetails.UserDetails userDetails) { return userRepository.findByEmail(userDetails.getUsername()).orElseThrow(() -> new RuntimeException("User not found")); }
}
