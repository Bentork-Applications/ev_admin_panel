package com.bentork.ev_system.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.CrmSetting;

@Repository
public interface CrmSettingRepository extends JpaRepository<CrmSetting, Long> {

    Optional<CrmSetting> findBySettingKey(String settingKey);
}
