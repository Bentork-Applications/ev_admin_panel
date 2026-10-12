package com.bentork.ev_system.dto.response;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CrmSettingResponse {
    private Long id;
    private String settingKey;
    private String settingValue;
    private String description;
    private LocalDateTime updatedAt;
}
