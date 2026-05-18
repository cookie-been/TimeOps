package com.timeops.platform.task.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record BackupTaskRequest(
        @NotNull(message = "instanceId must not be null")
        UUID instanceId
) {
}
