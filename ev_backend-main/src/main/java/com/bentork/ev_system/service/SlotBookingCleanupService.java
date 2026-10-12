package com.bentork.ev_system.service;

import com.bentork.ev_system.service.interfaces.IUserNotificationService;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.enums.BookingStatus;
import com.bentork.ev_system.model.Slot;
import com.bentork.ev_system.model.SlotBooking;
import com.bentork.ev_system.repository.SessionRepository;
import com.bentork.ev_system.repository.SlotBookingRepository;
import com.bentork.ev_system.repository.SlotRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Scheduled cleanup service that automatically expires slot bookings.
 * 
 * Two expiry strategies:
 * 1. OVERDUE: Slot's end time has passed and booking is still "booked"
 * 2. NO-SHOW: Slot's start time + 10 minutes has passed, booking is still
 *    "booked", and no active/initiated session exists for the user on that charger
 * 
 * Handles both:
 * - Date-specific slots (startTime/endTime is a full LocalDateTime)
 * - All-day / recurring slots (startTimeOnly/endTimeOnly is a LocalTime, no date)
 * 
 * This prevents "ghost bookings" from blocking charger slots
 * when users book a slot but never show up.
 * 
 * Runs every 5 minutes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlotBookingCleanupService {

    private static final int NO_SHOW_TIMEOUT_MINUTES = 10;

    private final SlotBookingRepository slotBookingRepository;

    private final SlotRepository slotRepository;

    private final SessionRepository sessionRepository;

    private final IUserNotificationService userNotificationService;

    /**
     * Runs every 5 minutes to find and expire overdue bookings AND no-show bookings.
     * 
     * A booking is considered OVERDUE if:
     * - Its status is still "booked"
     * - The slot's end time has already passed (date-specific OR all-day)
     * 
     * A booking is considered a NO-SHOW if:
     * - Its status is still "booked"
     * - The slot's start time + 10 minutes has passed
     * - No active or initiated charging session exists for the user on that charger
     */
    @Scheduled(fixedRate = 300000) // every 5 minutes
    @Transactional
    public void expireOverdueBookings() {
        try {
            // ===== PASS 1: Overdue bookings (slot end time has passed) =====

            // 1. Find expired date-specific bookings (endTime < now)
            List<SlotBooking> expiredDateSpecific = slotBookingRepository
                    .findExpiredBookings(LocalDateTime.now());

            // 2. Find expired all-day/recurring bookings (endTimeOnly < current time)
            List<SlotBooking> expiredAllDay = slotBookingRepository
                    .findExpiredAllDayBookings(LocalTime.now());

            // 3. Combine both lists
            List<SlotBooking> allExpired = new ArrayList<>();
            allExpired.addAll(expiredDateSpecific);
            allExpired.addAll(expiredAllDay);

            if (!allExpired.isEmpty()) {
                log.info("Found {} expired slot booking(s) ({} date-specific, {} all-day). Processing...",
                        allExpired.size(), expiredDateSpecific.size(), expiredAllDay.size());

                for (SlotBooking booking : allExpired) {
                    try {
                        expireBooking(booking);
                    } catch (Exception e) {
                        log.error("Failed to expire booking {}: {}",
                                booking.getId(), e.getMessage(), e);
                    }
                }
            }

            // ===== PASS 2: No-show bookings (slot started 10+ min ago, no session) =====
            expireNoShowBookings();

        } catch (Exception e) {
            log.error("Slot booking cleanup job encountered an error: {}", e.getMessage(), e);
        }
    }

    /**
     * Expires bookings where the slot's start time + 10 minutes has passed
     * but the user has not started a charging session.
     * 
     * This prevents a no-show user from blocking a charger for the entire
     * slot duration. After 10 minutes without a session, the booking is
     * expired and the slot is released.
     */
    private void expireNoShowBookings() {
        LocalDateTime dateCutoff = LocalDateTime.now().minusMinutes(NO_SHOW_TIMEOUT_MINUTES);
        LocalTime timeCutoff = LocalTime.now().minusMinutes(NO_SHOW_TIMEOUT_MINUTES);

        // Find date-specific bookings where start time + 10 min has passed
        List<SlotBooking> noShowDateSpecific = slotBookingRepository
                .findNoShowDateSpecificBookings(dateCutoff);

        // Find all-day bookings where start time + 10 min has passed
        List<SlotBooking> noShowAllDay = slotBookingRepository
                .findNoShowAllDayBookings(timeCutoff);

        List<SlotBooking> allNoShows = new ArrayList<>();
        allNoShows.addAll(noShowDateSpecific);
        allNoShows.addAll(noShowAllDay);

        if (allNoShows.isEmpty()) {
            return;
        }

        int expiredCount = 0;
        for (SlotBooking booking : allNoShows) {
            try {
                // Only expire if no active/initiated session exists for this user on this charger
                boolean hasSession = sessionRepository.existsByUserIdAndChargerIdAndStatusIn(
                        booking.getUser().getId(),
                        booking.getCharger().getId(),
                        List.of("active", "initiated"));

                if (!hasSession) {
                    log.info("No-show detected: bookingId={}, userId={}, chargerId={} — no session started within {} minutes",
                            booking.getId(), booking.getUser().getId(),
                            booking.getCharger().getId(), NO_SHOW_TIMEOUT_MINUTES);
                    expireBooking(booking);
                    expiredCount++;
                }
            } catch (Exception e) {
                log.error("Failed to expire no-show booking {}: {}",
                        booking.getId(), e.getMessage(), e);
            }
        }

        if (expiredCount > 0) {
            log.info("No-show cleanup: expired {} booking(s) out of {} candidates",
                    expiredCount, allNoShows.size());
        }
    }

    /**
     * Marks a single booking as EXPIRED and releases the slot.
     */
    private void expireBooking(SlotBooking booking) {
        Slot slot = booking.getSlot();

        log.info("Expiring booking: bookingId={}, userId={}, slotId={}, allDay={}, endTime={}, endTimeOnly={}",
                booking.getId(),
                booking.getUser().getId(),
                slot.getId(),
                slot.isAllDay(),
                slot.getEndTime(),
                slot.getEndTimeOnly());

        // 1. Mark booking as EXPIRED
        booking.setStatus(BookingStatus.EXPIRED.getValue());
        slotBookingRepository.save(booking);

        // 2. Release the slot
        slot.setBooked(false);
        slotRepository.save(slot);

        // 3. Build time range string for notification (handles both slot types)
        String timeRange;
        if (slot.isAllDay()) {
            timeRange = slot.getStartTimeOnly() + " - " + slot.getEndTimeOnly();
        } else {
            timeRange = slot.getStartTime().toLocalTime() + " - " + slot.getEndTime().toLocalTime();
        }

        // 4. Notify user
        userNotificationService.createNotification(
                booking.getUser().getId(),
                "Booking Expired",
                "Your slot booking for " + timeRange
                        + " has expired because you did not start a charging session.",
                "BOOKING_EXPIRED");

        log.info("✅ Booking {} expired and slot {} released", booking.getId(), slot.getId());
    }
}
