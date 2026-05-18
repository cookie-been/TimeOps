package com.timeops.platform.template.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ProductTemplateResponse(
        UUID id,
        String name,
        String productCode,
        List<String> supportedReleaseSources,
        String defaultWorkDir,
        JsonNode defaultConfig,
        String description,
        List<TemplateActionResponse> actions,
        String recordStatus,
        OffsetDateTime archivedAt
) {
}
