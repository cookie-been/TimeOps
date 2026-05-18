package com.timeops.platform.task.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TaskSubmissionResponse(
        UUID id,
        String taskNumber,
        String status,
        OffsetDateTime createdAt
) {
}
