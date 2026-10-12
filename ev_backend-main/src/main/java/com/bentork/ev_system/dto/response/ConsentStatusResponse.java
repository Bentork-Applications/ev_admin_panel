package com.bentork.ev_system.dto.response;

import com.bentork.ev_system.model.enums.ConsentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO representing the status of a single consent type for a user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsentStatusResponse {

    private ConsentType consentType;
    private boolean granted;
    private LocalDateTime grantedAt;
    private LocalDateTime withdrawnAt;
    private String version;
}
