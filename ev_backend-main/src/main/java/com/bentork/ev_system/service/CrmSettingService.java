package com.bentork.ev_system.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bentork.ev_system.dto.request.UpdateCrmSettingDTO;
import com.bentork.ev_system.dto.response.CrmSettingResponse;
import com.bentork.ev_system.model.CrmSetting;
import com.bentork.ev_system.repository.CrmSettingRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CrmSettingService {

    private final CrmSettingRepository crmSettingRepository;

    public List<CrmSettingResponse> getAllSettings() {
        return crmSettingRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CrmSettingResponse getSettingByKey(String key) {
        CrmSetting setting = crmSettingRepository.findBySettingKey(key)
                .orElseThrow(() -> new IllegalArgumentException("Setting not found with key: " + key));
        return mapToResponse(setting);
    }

    @Transactional
    public CrmSettingResponse updateSetting(String key, UpdateCrmSettingDTO dto) {
        CrmSetting setting = crmSettingRepository.findBySettingKey(key).orElseGet(() -> {
            CrmSetting newSetting = new CrmSetting();
            newSetting.setSettingKey(key);
            return newSetting;
        });

        setting.setSettingValue(dto.getSettingValue());
        if (dto.getDescription() != null) {
            setting.setDescription(dto.getDescription());
        }

        CrmSetting saved = crmSettingRepository.save(setting);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteSetting(String key) {
        CrmSetting setting = crmSettingRepository.findBySettingKey(key)
                .orElseThrow(() -> new IllegalArgumentException("Setting not found with key: " + key));
        crmSettingRepository.delete(setting);
    }

    private CrmSettingResponse mapToResponse(CrmSetting setting) {
        CrmSettingResponse response = new CrmSettingResponse();
        response.setId(setting.getId());
        response.setSettingKey(setting.getSettingKey());
        response.setSettingValue(setting.getSettingValue());
        response.setDescription(setting.getDescription());
        response.setUpdatedAt(setting.getUpdatedAt());
        return response;
    }
}
