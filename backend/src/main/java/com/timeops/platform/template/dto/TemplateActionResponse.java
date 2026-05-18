package com.timeops.platform.template.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

public record TemplateActionResponse(
        UUID id,
        String actionType,
        String mode,
        String scriptBody,
        JsonNode stepDefinition,
        Integer executionOrder
) {
}
