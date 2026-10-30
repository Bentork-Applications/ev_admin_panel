package com.bentork.ev_system.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bentork.ev_system.dto.request.SlotDTO;
import com.bentork.ev_system.service.SlotService;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/slots")
public class SlotController {
    private final SlotService slotService;

    /**
     * Create a single slot for a charger.
     * Admin only.
     */
    @PostMapping
    public ResponseEntity<?> createSlot(
            @RequestBody SlotDTO request) {

        log.info("POST /api/slots - Creating slot for chargerId={}", request.getChargerId());

        try {
            SlotDTO created = slotService.createSlot(request);
            log.info("POST /api/slots - Success, slotId={}", created.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            log.warn("POST /api/slots - Bad request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("POST /api/slots - Failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/slots - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create slot"));
        }
    }

    /**
     * Auto-generate slots for a full day for a charger.
     * Admin only.
     * 
     * Request body example (all-day / everyday slots):
     * {
     * "chargerId": 5,
     * "durationMinutes": 60,
     * "allDay": true
     * }
     * 
     * Request body example (date-specific slots):
     * {
     * "chargerId": 5,
     * "date": "2026-02-20",
     * "durationMinutes": 60,
     * "allDay": false
     * }
     */
    @PostMapping("/bulk")
    public ResponseEntity<?> createBulkSlots(
            @RequestBody SlotDTO request) {

        log.info("POST /api/slots/bulk - Creating bulk slots for chargerId={}, date={}, duration={}min, allDay={}",
                request.getChargerId(), request.getDate(), request.getDurationMinutes(), request.isAllDay());

        try {
            List<SlotDTO> created = slotService.createBulkSlots(
                    request.getChargerId(), request.getDate(), request.getDurationMinutes(), request.isAllDay());

            String message = request.isAllDay()
                    ? created.size() + " all-day (everyday) slots created successfully"
                    : created.size() + " slots created successfully for " + request.getDate();

            log.info("POST /api/slots/bulk - Success, {} slots created", created.size());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", message,
                    "slots", created));
        } catch (IllegalArgumentException e) {
            log.warn("POST /api/slots/bulk - Bad request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("POST /api/slots/bulk - Failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("POST /api/slots/bulk - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create bulk slots"));
        }
    }

    /**
     * Get all slots for a charger (admin view — includes booked and past slots).
     */
    @GetMapping("/charger/{chargerId}")
    public ResponseEntity<?> getSlotsByCharger(
            @PathVariable Long chargerId) {

        log.info("GET /api/slots/charger/{} - Fetching all slots", chargerId);

        try {
            List<SlotDTO> slots = slotService.getSlotsByCharger(chargerId);
            log.info("GET /api/slots/charger/{} - Success, {} slots found", chargerId, slots.size());
            return ResponseEntity.ok(slots);
        } catch (RuntimeException e) {
            log.error("GET /api/slots/charger/{} - Failed: {}", chargerId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GET /api/slots/charger/{} - Failed: {}", chargerId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch slots"));
        }
    }

    /**
     * Get available (unbooked, future) slots for a charger.
     * This is the endpoint the mobile app will use.
     */
    @GetMapping("/charger/{chargerId}/available")
    public ResponseEntity<?> getAvailableSlots(
            @PathVariable Long chargerId) {

        log.info("GET /api/slots/charger/{}/available - Fetching available slots", chargerId);

        try {
            List<SlotDTO> slots = slotService.getAvailableSlots(chargerId);
            log.info("GET /api/slots/charger/{}/available - Success, {} available slots",
                    chargerId, slots.size());
            return ResponseEntity.ok(slots);
        } catch (RuntimeException e) {
            log.error("GET /api/slots/charger/{}/available - Failed: {}", chargerId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GET /api/slots/charger/{}/available - Failed: {}", chargerId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch available slots"));
        }
    }

    /**
     * Delete an unbooked slot.
     * Admin only.
     */
    @DeleteMapping("/{slotId}")
    public ResponseEntity<?> deleteSlot(
            @PathVariable Long slotId) {

        log.info("DELETE /api/slots/{} - Deleting slot", slotId);

        try {
            slotService.deleteSlot(slotId);
            log.info("DELETE /api/slots/{} - Success", slotId);
            return ResponseEntity.ok(Map.of("message", "Slot deleted successfully"));
        } catch (IllegalStateException e) {
            log.warn("DELETE /api/slots/{} - Cannot delete: {}", slotId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("DELETE /api/slots/{} - Failed: {}", slotId, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("DELETE /api/slots/{} - Failed: {}", slotId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete slot"));
        }
    }
}
