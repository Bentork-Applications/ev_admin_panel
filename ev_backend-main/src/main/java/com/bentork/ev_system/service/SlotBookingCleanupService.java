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
import com.bentork.ev_system.repository.SlotBookingRepository;
import com.bentork.ev_system.repository.SlotRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

/**
 * Scheduled cleanup service that automatically expires slot bookings
 * where the slot's end time has passed and the booking status is still
 * "booked".
 * 
 * Handles both:
 * - Date-specific slots (endTime is a full LocalDateTime)
 * - All-day / recurring slots (endTimeOnly is a LocalTime, no date)
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

    private final SlotBookingRepository slotBookingRepository;

    private final SlotRepository slotRepository;

    private final IUserNotificationService userNotificationService;

    /**
     * Runs every 5 minutes to find and expire overdue bookings.
     * A booking is considered expired if:
     * - Its status is still "booked"
     * - The slot's end time has already passed (date-specific OR all-day)
     */
    @Scheduled(fixedRate = 300000) // every 5 minutes
    @Transactional
    public void expireOverdueBookings() {
        try {
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

            if (allExpired.isEmpty()) {
                return; // Nothing to clean up — skip logging to reduce noise
            }

            log.info("Found {} expired slot booking(s) ({} date-specific, {} all-day). Processing...",
                    allExpired.size(), expiredDateSpecific.size(), expiredAllDay.size());

            for (SlotBooking booking : allExpired) {
                try {
                    expireBooking(booking);
                } catch (Exception e) {
                    // Log but continue processing other expired bookings
                    log.error("Failed to expire booking {}: {}",
                            booking.getId(), e.getMessage(), e);
                }
            }

        } catch (Exception e) {
            log.error("Slot booking cleanup job encountered an error: {}", e.getMessage(), e);
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
