package com.bentork.ev_system.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.SlotDTO;
import com.bentork.ev_system.mapper.SlotMapper;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Slot;
import com.bentork.ev_system.model.SlotBooking;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.SlotBookingRepository;
import com.bentork.ev_system.repository.SlotRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@Service
@RequiredArgsConstructor
public class SlotService {

        private final SlotRepository slotRepository;

        private final ChargerRepository chargerRepository;

        private final SlotBookingRepository slotBookingRepository;

        /**
         * Create a single slot for a charger.
         * Validates time range and checks for overlapping slots.
         */
        @Transactional
        @CacheEvict(value = "slots", allEntries = true)
        public SlotDTO createSlot(SlotDTO dto) {
                log.info("Creating slot for chargerId={}, startTime={}, endTime={}",
                                dto.getChargerId(), dto.getStartTime(), dto.getEndTime());

                // Validate charger exists
                Charger charger = chargerRepository.findById(dto.getChargerId())
                                .orElseThrow(() -> new RuntimeException(
                                                "Charger not found with id: " + dto.getChargerId()));

                // Validate time range
                if (dto.getStartTime() == null || dto.getEndTime() == null) {
                        throw new IllegalArgumentException("Start time and end time are required");
                }
                if (!dto.getEndTime().isAfter(dto.getStartTime())) {
                        throw new IllegalArgumentException("End time must be after start time");
                }

                // Check for overlapping slots on the same charger
                List<Slot> overlapping = slotRepository.findOverlappingSlots(
                                dto.getChargerId(), dto.getStartTime(), dto.getEndTime());
                if (!overlapping.isEmpty()) {
                        throw new IllegalArgumentException(
                                        "Slot overlaps with an existing slot on this charger. Overlapping slot ID: "
                                                        + overlapping.get(0).getId());
                }

                Slot slot = SlotMapper.toEntity(dto, charger);
                Slot saved = slotRepository.save(slot);

                log.info("Slot created successfully: slotId={}, chargerId={}", saved.getId(), charger.getId());
                return SlotMapper.toDTO(saved);
        }

        /**
         * Auto-generate slots for an entire day for a specific charger.
         * 
         * Two modes:
         * 1. allDay=true: Creates recurring everyday slots (not date-specific).
         * These slots show up every day. No date parameter needed.
         * 2. allDay=false: Creates slots for a specific date (original behavior).
         * 
         * @param chargerId       the charger to create slots for
         * @param date            the date (e.g., "2026-02-20") — required only when
         *                        allDay=false
         * @param durationMinutes slot duration in minutes (e.g., 30 or 60)
         * @param allDay          if true, creates recurring everyday slots
         * @return list of created slots
         */
        @Transactional
        @CacheEvict(value = "slots", allEntries = true)
        public List<SlotDTO> createBulkSlots(Long chargerId, String date, int durationMinutes, boolean allDay) {
                log.info("Creating bulk slots for chargerId={}, date={}, durationMinutes={}, allDay={}",
                                chargerId, date, durationMinutes, allDay);

                // Validate charger exists
                Charger charger = chargerRepository.findById(chargerId)
                                .orElseThrow(() -> new RuntimeException("Charger not found with id: " + chargerId));

                // Validate duration
                if (durationMinutes <= 0 || durationMinutes > 1440) {
                        throw new IllegalArgumentException("Duration must be between 1 and 1440 minutes");
                }

                List<Slot> slots = new ArrayList<>();

                if (allDay) {
                        // --- ALL DAY MODE: Recurring everyday slots ---

                        // Check if all-day slots already exist for this charger
                        List<Slot> existingAllDaySlots = slotRepository.findByChargerIdAndAllDayTrue(chargerId);
                        if (!existingAllDaySlots.isEmpty()) {
                                throw new IllegalArgumentException(
                                                "All-day slots already exist for this charger. Delete existing all-day slots first.");
                        }

                        // Generate time-only slots for the entire day (00:00 to 24:00)
                        LocalTime slotStart = LocalTime.MIDNIGHT; // 00:00
                        int totalMinutesInDay = 24 * 60; // 1440
                        int currentMinute = 0;

                        while (currentMinute + durationMinutes <= totalMinutesInDay) {
                                LocalTime slotEnd = slotStart.plusMinutes(durationMinutes);

                                Slot slot = new Slot();
                                slot.setCharger(charger);
                                slot.setStartTime(null); // no date for all-day slots
                                slot.setEndTime(null); // no date for all-day slots
                                slot.setStartTimeOnly(slotStart); // only time
                                slot.setEndTimeOnly(slotEnd); // only time
                                slot.setBooked(false);
                                slot.setAllDay(true);

                                slots.add(slot);
                                slotStart = slotEnd;
                                currentMinute += durationMinutes;
                        }

                        List<Slot> savedSlots = slotRepository.saveAll(slots);

                        log.info("All-day bulk slots created: {} slots for chargerId={} (everyday recurring)",
                                        savedSlots.size(), chargerId);

                        return savedSlots.stream()
                                        .map(SlotMapper::toDTO)
                                        .collect(Collectors.toList());

                } else {
                        // --- DATE-SPECIFIC MODE: Original behavior ---

                        if (date == null || date.isEmpty()) {
                                throw new IllegalArgumentException(
                                                "Date is required when allDay is false. Provide date in yyyy-MM-dd format, or set allDay=true for everyday slots.");
                        }

                        // Parse the date
                        LocalDate localDate;
                        try {
                                localDate = LocalDate.parse(date);
                        } catch (Exception e) {
                                throw new IllegalArgumentException(
                                                "Invalid date format. Use yyyy-MM-dd (e.g., 2026-02-20)");
                        }

                        // Check if slots already exist for this charger on this date
                        LocalDateTime dayStart = localDate.atStartOfDay();
                        LocalDateTime dayEnd = localDate.atTime(LocalTime.MAX);
                        List<Slot> existingSlots = slotRepository.findByChargerIdAndDate(chargerId, dayStart, dayEnd);
                        if (!existingSlots.isEmpty()) {
                                throw new IllegalArgumentException(
                                                "Slots already exist for this charger on " + date
                                                                + ". Delete existing slots first or choose another date.");
                        }

                        // Generate slots for the entire day (00:00 to 24:00)
                        LocalDateTime slotStart = dayStart;
                        LocalDateTime endOfDay = localDate.plusDays(1).atStartOfDay();

                        while (slotStart.plusMinutes(durationMinutes).compareTo(endOfDay) <= 0) {
                                LocalDateTime slotEnd = slotStart.plusMinutes(durationMinutes);

                                Slot slot = new Slot();
                                slot.setCharger(charger);
                                slot.setStartTime(slotStart);
                                slot.setEndTime(slotEnd);
                                slot.setBooked(false);
                                slot.setAllDay(false);

                                slots.add(slot);
                                slotStart = slotEnd;
                        }

                        List<Slot> savedSlots = slotRepository.saveAll(slots);

                        log.info("Bulk slots created: {} slots for chargerId={} on {}",
                                        savedSlots.size(), chargerId, date);

                        return savedSlots.stream()
                                        .map(SlotMapper::toDTO)
                                        .collect(Collectors.toList());
                }
        }

        /**
         * Get all available (unbooked) slots for a charger.
         * Includes:
         * - Future date-specific slots
         * - All-day (recurring everyday) unbooked slots
         */
        @Cacheable(value = "slots", key = "'available-' + #chargerId")
        public List<SlotDTO> getAvailableSlots(Long chargerId) {
                log.info("Fetching available slots for chargerId={}", chargerId);

                // Validate charger exists
                chargerRepository.findById(chargerId)
                                .orElseThrow(() -> new RuntimeException("Charger not found with id: " + chargerId));

                // Get future date-specific unbooked slots
                List<Slot> dateSpecificSlots = slotRepository.findByChargerIdAndBookedFalseAndStartTimeAfter(
                                chargerId, LocalDateTime.now());

                // Get all-day (recurring everyday) unbooked slots
                List<Slot> allDaySlots = slotRepository.findByChargerIdAndAllDayTrueAndBookedFalse(chargerId);

                // Combine both lists
                List<Slot> allSlots = new ArrayList<>();
                allSlots.addAll(allDaySlots);
                allSlots.addAll(dateSpecificSlots);

                return allSlots.stream()
                                .map(SlotMapper::toDTO)
                                .collect(Collectors.toList());
        }

        /**
         * Get all slots for a charger (admin view — includes booked and past slots).
         */
        @Cacheable(value = "slots", key = "'charger-' + #chargerId")
        public List<SlotDTO> getSlotsByCharger(Long chargerId) {
                log.info("Fetching all slots for chargerId={}", chargerId);

                // Validate charger exists
                chargerRepository.findById(chargerId)
                                .orElseThrow(() -> new RuntimeException("Charger not found with id: " + chargerId));

                List<Slot> slots = slotRepository.findByChargerId(chargerId);

                return slots.stream()
                                .map(SlotMapper::toDTO)
                                .collect(Collectors.toList());
        }

        /**
         * Get a slot by ID.
         */
        public Slot getSlotById(Long slotId) {
                return slotRepository.findById(slotId)
                                .orElseThrow(() -> new RuntimeException("Slot not found with id: " + slotId));
        }

        /**
         * Delete an unbooked slot (admin only).
         */
        @Transactional
        @CacheEvict(value = "slots", allEntries = true)
        public void deleteSlot(Long slotId) {
                log.info("Deleting slot: slotId={}", slotId);

                Slot slot = slotRepository.findById(slotId)
                                .orElseThrow(() -> new RuntimeException("Slot not found with id: " + slotId));

                // Check if there's an active booking for this slot
                List<SlotBooking> bookings = slotBookingRepository.findBySlotId(slotId);
                boolean hasActiveBooking = bookings.stream()
                                .anyMatch(b -> "booked".equalsIgnoreCase(b.getStatus()));
                if (hasActiveBooking) {
                        throw new IllegalStateException(
                                        "Cannot delete slot " + slotId
                                                        + " because it has an active booking. Cancel the booking first.");
                }

                // Delete all associated slot bookings (cancelled/expired) before deleting the
                // slot
                slotBookingRepository.deleteBySlotId(slotId);
                log.info("Deleted associated bookings for slotId={}", slotId);

                slotRepository.delete(slot);
                log.info("Slot deleted successfully: slotId={}", slotId);
        }
}
