package com.timeops.platform.server.dto;

import java.util.List;
import java.util.UUID;

public record ServerSummaryResponse(
        UUID id,
        UUID customerId,
        String host,
        Integer sshPort,
        String sshUsername,
        String sshPasswordMasked,
        String osLabel,
        List<String> tags,
        String connectivityStatus,
        String notes
) {
}
