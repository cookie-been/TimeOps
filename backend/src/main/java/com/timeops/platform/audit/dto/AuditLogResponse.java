package com.timeops.platform.audit.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String actorName,
        String actionType,
        String targetType,
        String targetId,
        UUID taskId,
        JsonNode detail,
        OffsetDateTime createdAt
) {
}
