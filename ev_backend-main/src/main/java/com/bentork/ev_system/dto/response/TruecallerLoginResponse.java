package com.bentork.ev_system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TruecallerLoginResponse {

    private String token;
    private boolean newUser;
    private String name;
    private String mobile;
    private String email;
    private String imageUrl;
}
