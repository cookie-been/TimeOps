package com.timeops.platform.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AdhocCommandRequest(
        @NotNull(message = "serverId must not be null")
        UUID serverId,
        @NotBlank(message = "command must not be blank")
        String command,
        boolean riskConfirmed
) {
}
