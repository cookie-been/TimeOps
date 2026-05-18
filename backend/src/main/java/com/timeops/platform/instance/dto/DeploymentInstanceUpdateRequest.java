package com.timeops.platform.instance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DeploymentInstanceUpdateRequest(
        @NotNull(message = "customerId must not be null")
        UUID customerId,
        @NotNull(message = "templateId must not be null")
        UUID templateId,
        @NotNull(message = "primaryServerId must not be null")
        UUID primaryServerId,
        @NotBlank(message = "instanceName must not be blank")
        String instanceName,
        @NotBlank(message = "environmentLabel must not be blank")
        String environmentLabel,
        JsonNode configOverride,
        String notes
) {
}
