package com.timeops.platform.task.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record RestartTaskRequest(
        @NotNull(message = "instanceId must not be null")
        UUID instanceId
) {
}
