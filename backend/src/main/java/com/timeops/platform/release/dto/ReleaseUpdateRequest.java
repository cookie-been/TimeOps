package com.timeops.platform.release.dto;

import com.timeops.platform.release.ReleaseSourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ReleaseUpdateRequest(
        @NotNull(message = "templateId must not be null")
        UUID templateId,
        @NotBlank(message = "versionLabel must not be blank")
        String versionLabel,
        @NotNull(message = "sourceType must not be null")
        ReleaseSourceType sourceType,
        String repositoryUrl,
        String gitRef,
        String packageUri,
        String changelog
) {
}
