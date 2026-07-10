package com.bentork.ev_system.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@Table(name = "truecaller_login_session")
public class TruecallerLoginSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String requestId;

    @Column(length = 1000)
    private String jwtToken;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, SUCCESS, FAILED

    private LocalDateTime createdAt = LocalDateTime.now();

    public TruecallerLoginSession(String requestId) {
        this.requestId = requestId;
    }
}
