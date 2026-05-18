package com.timeops.platform.task.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OperationTaskResponse(
        UUID id,
        String taskNumber,
        String taskType,
        UUID targetServerId,
        UUID targetInstanceId,
        UUID releaseId,
        String status,
        String commandInput,
        String outputLog,
        String errorLog,
        Integer exitCode,
        OffsetDateTime startedAt,
        OffsetDateTime endedAt,
        OffsetDateTime createdAt
) {
}
