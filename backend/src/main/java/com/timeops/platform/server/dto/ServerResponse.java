package com.timeops.platform.server.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ServerResponse(
        UUID id,
        UUID customerId,
        String host,
        Integer sshPort,
        String sshUsername,
        String sshPasswordMasked,
        String osLabel,
        String connectivityStatus,
        String notes,
        String recordStatus,
        OffsetDateTime archivedAt
) {
}
