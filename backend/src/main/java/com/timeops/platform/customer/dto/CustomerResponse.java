package com.timeops.platform.customer.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CustomerResponse(
        UUID id,
        String name,
        String contactName,
        String contactPhone,
        String contactEmail,
        String notes,
        String recordStatus,
        OffsetDateTime archivedAt
) {
}
