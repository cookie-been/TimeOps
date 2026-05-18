package com.timeops.platform.release.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReleaseResponse(
        UUID id,
        UUID templateId,
        String versionLabel,
        String sourceType,
        String repositoryUrl,
        String gitRef,
        String packageUri,
        String changelog,
        UUID createdBy,
        OffsetDateTime createdAt,
        String recordStatus,
        OffsetDateTime archivedAt
) {
}
