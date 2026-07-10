package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.EmergencyContactDTO;
import com.bentork.ev_system.mapper.EmergencyContactMapper;
import com.bentork.ev_system.model.EmergencyContact;
import com.bentork.ev_system.model.Station;
import com.bentork.ev_system.repository.EmergencyContactRepository;
import com.bentork.ev_system.repository.StationRepository;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmergencyContactService {

    private final EmergencyContactRepository contactRepository;

    private final StationRepository stationRepository;

    public void createEmergencyContact(EmergencyContactDTO dto) {
        try {
            Station station = stationRepository.findById(dto.getStationId())
                    .orElseThrow(() -> new RuntimeException("Station not found"));

            // Each station can have only one emergency contact record
            if (contactRepository.existsByStationId(dto.getStationId())) {
                throw new RuntimeException("Emergency contact already exists for station: " + station.getName());
            }

            EmergencyContact contact = EmergencyContactMapper.toEntity(dto, station);
            EmergencyContact saved = contactRepository.save(contact);

            log.info("Emergency contact created: id={}, stationId={}, cpo={}, support={}",
                    saved.getId(), station.getId(), saved.getCpoPhoneNumber(), saved.getCompanySupportNumber());
        } catch (RuntimeException e) {
            log.error("Failed to create emergency contact: stationId={}, message={}",
                    dto.getStationId(), e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to create emergency contact: stationId={}: {}",
                    dto.getStationId(), e.getMessage(), e);
            throw e;
        }
    }

    public List<EmergencyContactDTO> getAllContacts() {
        try {
            List<EmergencyContactDTO> contacts = contactRepository.findAll().stream()
                    .map(EmergencyContactMapper::toDTO)
                    .collect(Collectors.toList());

            if (log.isDebugEnabled()) {
                log.debug("Retrieved {} emergency contacts", contacts.size());
            }

            return contacts;
        } catch (Exception e) {
            log.error("Failed to retrieve all emergency contacts: {}", e.getMessage(), e);
            throw e;
        }
    }

    public EmergencyContactDTO getEmergencyContactById(Long id) {
        try {
            EmergencyContact contact = contactRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Contact not found"));

            if (log.isDebugEnabled()) {
                log.debug("Retrieved emergency contact: id={}", id);
            }

            return EmergencyContactMapper.toDTO(contact);
        } catch (RuntimeException e) {
            log.warn("Emergency contact not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to retrieve emergency contact: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    public EmergencyContactDTO getByStationId(Long stationId) {
        try {
            EmergencyContact contact = contactRepository.findByStationId(stationId)
                    .orElseThrow(() -> new RuntimeException("Emergency contact not found for station: " + stationId));

            log.info("Retrieved emergency contact for stationId={}", stationId);
            return EmergencyContactMapper.toDTO(contact);
        } catch (RuntimeException e) {
            log.warn("Emergency contact not found for stationId={}", stationId);
            throw e;
        } catch (Exception e) {
            log.error("Failed to retrieve emergency contact for stationId={}: {}", stationId, e.getMessage(), e);
            throw e;
        }
    }

    public void updateContact(Long id, EmergencyContactDTO dto) {
        try {
            EmergencyContact existing = contactRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Contact not found"));

            Station station = stationRepository.findById(dto.getStationId())
                    .orElseThrow(() -> new RuntimeException("Station not found"));

            EmergencyContact updated = EmergencyContactMapper.toEntity(dto, station);
            updated.setId(id);
            contactRepository.save(updated);

            log.info("Emergency contact updated: id={}, cpo={}, support={}",
                    id, updated.getCpoPhoneNumber(), updated.getCompanySupportNumber());
        } catch (RuntimeException e) {
            log.warn("Failed to update emergency contact - Entity not found: contactId={}, message={}",
                    id, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to update emergency contact: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    public void deleteContact(Long id) {
        try {
            if (!contactRepository.existsById(id)) {
                throw new RuntimeException("Contact not found");
            }
            contactRepository.deleteById(id);
            log.info("Emergency contact deleted: id={}", id);
        } catch (RuntimeException e) {
            log.warn("Failed to delete emergency contact - Contact not found: id={}", id);
            throw e;
        } catch (Exception e) {
            log.error("Failed to delete emergency contact: id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}