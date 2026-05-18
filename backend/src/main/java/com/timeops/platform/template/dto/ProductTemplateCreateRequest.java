package com.timeops.platform.template.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.release.ReleaseSourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductTemplateCreateRequest(
        @NotBlank(message = "name must not be blank")
        String name,
        @NotBlank(message = "productCode must not be blank")
        String productCode,
        @NotEmpty(message = "supportedReleaseSources must not be empty")
        List<@NotNull(message = "supportedReleaseSources item must not be null") ReleaseSourceType> supportedReleaseSources,
        String defaultWorkDir,
        JsonNode defaultConfig,
        String description,
        @NotEmpty(message = "actions must not be empty")
        List<@Valid TemplateActionRequest> actions
) {
}
