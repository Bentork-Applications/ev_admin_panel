package com.bentork.ev_system.controller;

import com.bentork.ev_system.dto.request.EmergencyContactDTO;
import com.bentork.ev_system.service.EmergencyContactService;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/emergency-contacts")
public class EmergencyContactController {
    private final EmergencyContactService contactService;

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<String> create(@RequestBody EmergencyContactDTO dto) {
        log.info("POST /api/emergency-contacts/add - Creating emergency contact, stationId={}",
                dto.getStationId());

        try {
            contactService.createEmergencyContact(dto);
            log.info("POST /api/emergency-contacts/add - Success, stationId={}", dto.getStationId());
            return ResponseEntity.status(HttpStatus.CREATED).body("Emergency Contact Created");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Station not found")) {
                log.error("POST /api/emergency-contacts/add - Station not found: stationId={}",
                        dto.getStationId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
            if (e.getMessage().contains("already exists")) {
                log.warn("POST /api/emergency-contacts/add - Duplicate: stationId={}",
                        dto.getStationId());
                return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
            }
            log.error("POST /api/emergency-contacts/add - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to create emergency contact");
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<EmergencyContactDTO>> getAll() {
        log.info("GET /api/emergency-contacts/all - Request received");

        try {
            List<EmergencyContactDTO> contacts = contactService.getAllContacts();
            log.info("GET /api/emergency-contacts/all - Success, returned {} contacts", contacts.size());
            return ResponseEntity.ok(contacts);
        } catch (Exception e) {
            log.error("GET /api/emergency-contacts/all - Failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        log.info("GET /api/emergency-contacts/{} - Request received", id);

        try {
            EmergencyContactDTO dto = contactService.getEmergencyContactById(id);
            log.info("GET /api/emergency-contacts/{} - Success", id);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.warn("GET /api/emergency-contacts/{} - Contact not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("GET /api/emergency-contacts/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch contact");
        }
    }

    @GetMapping("/by-station/{stationId}")
    public ResponseEntity<?> getByStation(@PathVariable Long stationId) {
        log.info("GET /api/emergency-contacts/by-station/{} - Request received", stationId);

        try {
            EmergencyContactDTO dto = contactService.getByStationId(stationId);
            log.info("GET /api/emergency-contacts/by-station/{} - Success", stationId);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            log.warn("GET /api/emergency-contacts/by-station/{} - Not found", stationId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("GET /api/emergency-contacts/by-station/{} - Failed: {}", stationId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch emergency contact for station");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<String> update(@PathVariable Long id, @RequestBody EmergencyContactDTO dto) {
        log.info("PUT /api/emergency-contacts/update/{} - Updating contact", id);

        try {
            contactService.updateContact(id, dto);
            log.info("PUT /api/emergency-contacts/update/{} - Success", id);
            return ResponseEntity.ok("Emergency Contact Updated");
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not found")) {
                log.warn("PUT /api/emergency-contacts/update/{} - Not found: {}", id, e.getMessage());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
            }
            log.error("PUT /api/emergency-contacts/update/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update contact");
        }
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        log.info("DELETE /api/emergency-contacts/delete/{} - Request received", id);

        try {
            contactService.deleteContact(id);
            log.info("DELETE /api/emergency-contacts/delete/{} - Success", id);
            return ResponseEntity.ok("Emergency Contact Deleted");
        } catch (RuntimeException e) {
            log.warn("DELETE /api/emergency-contacts/delete/{} - Contact not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            log.error("DELETE /api/emergency-contacts/delete/{} - Failed: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete contact");
        }
    }
}