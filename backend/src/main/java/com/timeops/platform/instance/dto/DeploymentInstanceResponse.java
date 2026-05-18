package com.timeops.platform.instance.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DeploymentInstanceResponse(
        UUID id,
        String instanceName,
        String environmentLabel,
        UUID customerId,
        UUID templateId,
        UUID primaryServerId,
        UUID currentReleaseId,
        String status,
        JsonNode configOverride,
        JsonNode mergedConfig,
        String notes,
        String recordStatus,
        OffsetDateTime archivedAt
) {
}
