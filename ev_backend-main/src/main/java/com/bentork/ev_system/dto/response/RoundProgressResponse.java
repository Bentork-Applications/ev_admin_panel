package com.bentork.ev_system.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoundProgressResponse {

    private Long roundId;
    private Integer roundNumber;
    private String status;
    private Integer totalAudience;
    private Integer eligibleCount;
    private Integer queuedCount;
    private Integer submittedCount;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer readCount;
    private Integer failedCount;
    private Integer skippedCount;

    private List<String> recentErrors;
}
