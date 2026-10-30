package com.bentork.ev_system.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.SlotBookingDTO;
import com.bentork.ev_system.enums.BookingStatus;
import com.bentork.ev_system.exception.SlotAlreadyBookedException;
import com.bentork.ev_system.exception.domain.SlotReservedException;
import com.bentork.ev_system.mapper.SlotBookingMapper;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Slot;
import com.bentork.ev_system.model.SlotBooking;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.model.User;
import com.bentork.ev_system.repository.SlotBookingRepository;
import com.bentork.ev_system.repository.SlotRepository;
import com.bentork.ev_system.repository.UserRepository;
import com.bentork.ev_system.service.interfaces.IMaintenanceService;
import com.bentork.ev_system.exception.domain.StationUnderMaintenanceException;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlotBookingService {

        private final SlotBookingRepository slotBookingRepository;

        private final SlotRepository slotRepository;

        private final UserRepository userRepository;

        private final IMaintenanceService maintenanceService;

        /**
         * Book a slot for a user.
         * 
         * Validations:
         * 1. Slot must exist
         * 2. Slot must not be already booked
         * 3. Slot must be in the future
         * 4. User must not already have an active booking on the same charger
         * 
         * Uses @Transactional to atomically mark slot as booked + create booking
         * record.
         */
        @Transactional
        public SlotBookingDTO bookSlot(Long userId, Long slotId) {
                log.info("Booking slot: userId={}, slotId={}", userId, slotId);

                // 1. Validate user exists
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

                // 2. Validate slot exists
                Slot slot = slotRepository.findById(slotId)
                                .orElseThrow(() -> new RuntimeException("Slot not found with id: " + slotId));

                // 3. Check if slot is already booked
                if (slot.isBooked()) {
                        throw new SlotAlreadyBookedException(slotId);
                }

                // 4. Check if slot is in the future (only for date-specific slots, not all-day)
                if (!slot.isAllDay() && slot.getStartTime() != null
                                && slot.getStartTime().isBefore(LocalDateTime.now())) {
                        throw new IllegalArgumentException(
                                        "Cannot book a slot in the past. Slot start time: " + slot.getStartTime());
                }

                // 5. Get charger and station from the slot
                Charger charger = slot.getCharger();
                Station station = charger.getStation();

                // 6. MAINTENANCE GUARD: Block booking if slot time overlaps a maintenance window
                if (slot.getStartTime() != null && slot.getEndTime() != null) {
                        if (maintenanceService.hasMaintenanceOverlap(
                                        charger.getId(), slot.getStartTime(), slot.getEndTime())) {
                                throw new StationUnderMaintenanceException(charger.getId(), "charger");
                        }
                }

                // 7. Check if user already has an active booking on this charger
                if (slotBookingRepository.hasActiveBooking(userId, charger.getId())) {
                        throw new IllegalStateException(
                                        "You already have an active booking for this charger. Cancel it first before booking a new slot.");
                }

                // 7. Atomically: Mark slot as booked + Create booking record
                slot.setBooked(true);
                slotRepository.save(slot);

                SlotBooking booking = new SlotBooking();
                booking.setSlot(slot);
                booking.setUser(user);
                booking.setStation(station);
                booking.setCharger(charger);
                booking.setStatus(BookingStatus.BOOKED.getValue());

                SlotBooking savedBooking = slotBookingRepository.save(booking);

                log.info("Slot booked successfully: bookingId={}, slotId={}, userId={}, chargerId={}, stationId={}",
                                savedBooking.getId(), slotId, userId, charger.getId(), station.getId());

                return SlotBookingMapper.toDTO(savedBooking);
        }

        /**
         * Cancel a booking.
         * Only the booking owner can cancel. Only bookings with status "booked" can be
         * cancelled.
         * Releases the slot so others can book it.
         */
        @Transactional
        public SlotBookingDTO cancelBooking(Long bookingId, Long userId) {
                log.info("Cancelling booking: bookingId={}, userId={}", bookingId, userId);

                // 1. Validate booking exists
                SlotBooking booking = slotBookingRepository.findById(bookingId)
                                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

                // 2. Verify ownership
                if (!booking.getUser().getId().equals(userId)) {
                        throw new IllegalStateException("You can only cancel your own bookings.");
                }

                // 3. Check if booking is still active (can only cancel "booked" status)
                if (!BookingStatus.BOOKED.matches(booking.getStatus())) {
                        throw new IllegalStateException(
                                        "Cannot cancel booking with status '" + booking.getStatus()
                                                        + "'. Only bookings with status 'booked' can be cancelled.");
                }

                // 4. Release the slot
                Slot slot = booking.getSlot();
                slot.setBooked(false);
                slotRepository.save(slot);

                // 5. Mark booking as cancelled
                booking.setStatus(BookingStatus.CANCELLED.getValue());
                SlotBooking updatedBooking = slotBookingRepository.save(booking);

                log.info("Booking cancelled successfully: bookingId={}, slotId={} released", bookingId, slot.getId());

                return SlotBookingMapper.toDTO(updatedBooking);
        }

        /**
         * Get all bookings for a user.
         */
        public List<SlotBookingDTO> getBookingsByUser(Long userId) {
                log.info("Fetching bookings for userId={}", userId);

                List<SlotBooking> bookings = slotBookingRepository.findByUserId(userId);

                return bookings.stream()
                                .map(SlotBookingMapper::toDTO)
                                .collect(Collectors.toList());
        }

        /**
         * Get active (status = "booked") bookings for a user.
         */
        public List<SlotBookingDTO> getActiveBookingsByUser(Long userId) {
                log.info("Fetching active bookings for userId={}", userId);

                List<SlotBooking> bookings = slotBookingRepository.findByUserIdAndStatus(
                                userId, BookingStatus.BOOKED.getValue());

                return bookings.stream()
                                .map(SlotBookingMapper::toDTO)
                                .collect(Collectors.toList());
        }

        /**
         * Get all bookings for a station (admin view).
         */
        public List<SlotBookingDTO> getBookingsByStation(Long stationId) {
                log.info("Fetching bookings for stationId={}", stationId);

                List<SlotBooking> bookings = slotBookingRepository.findByStationId(stationId);

                return bookings.stream()
                                .map(SlotBookingMapper::toDTO)
                                .collect(Collectors.toList());
        }

        /**
         * Get a single booking by ID.
         */
        public SlotBookingDTO getBookingById(Long bookingId) {
                log.info("Fetching booking: bookingId={}", bookingId);

                SlotBooking booking = slotBookingRepository.findById(bookingId)
                                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

                return SlotBookingMapper.toDTO(booking);
        }

        /**
         * Mark a booking as completed (called when a user starts a charging session
         * during their booked slot time).
         */
        @Transactional
        public void completeBooking(Long userId, Long chargerId) {
                log.info("Completing booking for userId={}, chargerId={}", userId, chargerId);

                slotBookingRepository.findActiveBookingForUserAndCharger(
                                userId, chargerId, LocalDateTime.now())
                                .ifPresent(booking -> {
                                        booking.setStatus(BookingStatus.COMPLETED.getValue());
                                        slotBookingRepository.save(booking);
                                        log.info("Booking completed: bookingId={}, userId={}, chargerId={}",
                                                        booking.getId(), userId, chargerId);
                                });
        }

        /**
         * ★ SLOT BOOKING GUARD — Called before starting any session (App or RFID).
         *
         * Checks if the charger has an active slot booking at the current time:
         * - No active booking → allow session (return silently)
         * - Active booking belongs to the requesting user → auto-complete booking, allow session
         * - Active booking belongs to a DIFFERENT user → throw SlotReservedException (HTTP 403)
         *
         * This method handles both date-specific and all-day (recurring) slots.
         */
        @Transactional
        public void validateAndHandleBooking(Long userId, Long chargerId) {
                LocalDateTime now = LocalDateTime.now();
                LocalTime currentTime = now.toLocalTime();

                Optional<SlotBooking> activeBooking = slotBookingRepository
                                .findActiveBookingOnChargerAtTime(chargerId, now, currentTime);

                if (activeBooking.isEmpty()) {
                        // No active booking on this charger right now — allow session
                        return;
                }

                SlotBooking booking = activeBooking.get();
                Slot slot = booking.getSlot();

                if (booking.getUser().getId().equals(userId)) {
                        // The requesting user IS the booking owner — auto-complete the booking
                        log.info("Booking owner starting session — auto-completing booking: bookingId={}, userId={}, chargerId={}",
                                        booking.getId(), userId, chargerId);

                        booking.setStatus(BookingStatus.COMPLETED.getValue());
                        slotBookingRepository.save(booking);

                        // Release the slot so it shows as available after the session
                        slot.setBooked(false);
                        slotRepository.save(slot);
                        return;
                }

                // Another user holds the booking — block this session
                String timeRange;
                if (slot.isAllDay()) {
                        timeRange = slot.getStartTimeOnly() + " - " + slot.getEndTimeOnly();
                } else {
                        timeRange = slot.getStartTime().toLocalTime() + " - " + slot.getEndTime().toLocalTime();
                }

                log.warn("Session blocked by slot booking: chargerId={}, requestingUserId={}, bookingOwnerId={}, timeRange={}",
                                chargerId, userId, booking.getUser().getId(), timeRange);

                throw new SlotReservedException(chargerId, booking.getUser().getId(), timeRange);
        }
}
