package com.bentork.ev_system.dto.request;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetryFailedMessagesDTO {

    private List<Long> messageIds; // Specific message IDs to retry (null to retry all failed in round)
}
