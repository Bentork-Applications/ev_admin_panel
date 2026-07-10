package com.bentork.ev_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TruecallerStatusResponse {
    private String status; // PENDING, SUCCESS, FAILED
    private String jwtToken;
}
