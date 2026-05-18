package com.timeops.platform.task.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record RollbackTaskRequest(
        @NotNull(message = "instanceId must not be null")
        UUID instanceId,
        @NotNull(message = "releaseId must not be null")
        UUID releaseId
) {
}
