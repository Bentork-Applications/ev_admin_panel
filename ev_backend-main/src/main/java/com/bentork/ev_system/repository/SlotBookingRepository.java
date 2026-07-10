package com.bentork.ev_system.repository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.bentork.ev_system.model.SlotBooking;

public interface SlotBookingRepository extends JpaRepository<SlotBooking, Long> {

        // Find all bookings by user
        List<SlotBooking> findByUserId(Long userId);

        // Find bookings by user and status
        List<SlotBooking> findByUserIdAndStatus(Long userId, String status);

        // Find all bookings by station
        List<SlotBooking> findByStationId(Long stationId);

        // Find all bookings by charger
        List<SlotBooking> findByChargerId(Long chargerId);

        // Find bookings by slot
        List<SlotBooking> findBySlotId(Long slotId);

        // Check if user already has an active booking for a charger
        @Query("SELECT COUNT(sb) > 0 FROM SlotBooking sb " +
                        "WHERE sb.user.id = :userId AND sb.charger.id = :chargerId " +
                        "AND sb.status = 'booked'")
        boolean hasActiveBooking(@Param("userId") Long userId,
                        @Param("chargerId") Long chargerId);

        // Find expired date-specific bookings (slots with endTime set)
        @Query("SELECT sb FROM SlotBooking sb " +
                        "WHERE sb.status = 'booked' AND sb.slot.endTime < :now")
        List<SlotBooking> findExpiredBookings(@Param("now") LocalDateTime now);

        // Find expired all-day (recurring) bookings where endTimeOnly has passed today
        @Query("SELECT sb FROM SlotBooking sb " +
                        "WHERE sb.status = 'booked' AND sb.slot.allDay = true " +
                        "AND sb.slot.endTimeOnly < :currentTime")
        List<SlotBooking> findExpiredAllDayBookings(@Param("currentTime") LocalTime currentTime);

        // Find active booking for a user on a specific charger at a given time
        @Query("SELECT sb FROM SlotBooking sb " +
                        "WHERE sb.user.id = :userId AND sb.charger.id = :chargerId " +
                        "AND sb.status = 'booked' " +
                        "AND sb.slot.startTime <= :now AND sb.slot.endTime >= :now")
        Optional<SlotBooking> findActiveBookingForUserAndCharger(@Param("userId") Long userId,
                        @Param("chargerId") Long chargerId,
                        @Param("now") LocalDateTime now);

        // Count active bookings for a user
        @Query("SELECT COUNT(sb) FROM SlotBooking sb " +
                        "WHERE sb.user.id = :userId AND sb.status = 'booked'")
        long countActiveBookingsByUser(@Param("userId") Long userId);

        // Delete all bookings associated with a slot
        void deleteBySlotId(Long slotId);

        /**
         * Find BOOKED slot bookings on a charger that overlap a maintenance time window.
         * Overlap logic: slot.startTime < maintEnd AND slot.endTime > maintStart
         *
         * Only cancels bookings within the maintenance window — bookings outside are untouched.
         */
        @Query("SELECT sb FROM SlotBooking sb " +
                        "WHERE sb.charger.id = :chargerId " +
                        "AND sb.status = 'booked' " +
                        "AND sb.slot.startTime < :endTime " +
                        "AND sb.slot.endTime > :startTime")
        List<SlotBooking> findOverlappingBookedSlots(@Param("chargerId") Long chargerId,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime);

        /**
         * Find any active (status='booked') booking on a charger at the current time.
         * Covers both:
         * - Date-specific slots: slot.startTime <= now AND slot.endTime >= now
         * - All-day (recurring) slots: slot.allDay = true AND slot.startTimeOnly <= currentTime AND slot.endTimeOnly >= currentTime
         *
         * Used by the slot booking guard to block non-booking users from starting sessions.
         */
        @Query("SELECT sb FROM SlotBooking sb " +
                        "WHERE sb.charger.id = :chargerId " +
                        "AND sb.status = 'booked' " +
                        "AND (" +
                        "  (sb.slot.allDay = false AND sb.slot.startTime <= :now AND sb.slot.endTime >= :now) " +
                        "  OR " +
                        "  (sb.slot.allDay = true AND sb.slot.startTimeOnly <= :currentTime AND sb.slot.endTimeOnly >= :currentTime)" +
                        ")")
        Optional<SlotBooking> findActiveBookingOnChargerAtTime(@Param("chargerId") Long chargerId,
                        @Param("now") LocalDateTime now,
                        @Param("currentTime") LocalTime currentTime);
}
