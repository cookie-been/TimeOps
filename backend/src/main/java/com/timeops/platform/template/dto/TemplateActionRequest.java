package com.timeops.platform.template.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.template.TemplateActionMode;
import com.timeops.platform.template.TemplateActionType;
import jakarta.validation.constraints.NotNull;

public record TemplateActionRequest(
        @NotNull(message = "actionType must not be null")
        TemplateActionType actionType,
        @NotNull(message = "mode must not be null")
        TemplateActionMode mode,
        String scriptBody,
        JsonNode stepDefinition,
        Integer executionOrder
) {
}
