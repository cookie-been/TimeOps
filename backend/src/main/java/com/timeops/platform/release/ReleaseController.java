package com.timeops.platform.release;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.release.dto.ReleaseCreateRequest;
import com.timeops.platform.release.dto.ReleaseResponse;
import com.timeops.platform.release.dto.ReleaseUpdateRequest;
import com.timeops.platform.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/releases")
public class ReleaseController {

    private final ReleaseService releaseService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public ReleaseController(
            ReleaseService releaseService,
            AuditService auditService,
            CurrentUserProvider currentUserProvider) {
        this.releaseService = releaseService;
        this.auditService = auditService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('RELEASE_READ')")
    public ApiResponse<List<ReleaseResponse>> listReleases(
            @RequestParam(name = "status", defaultValue = "ACTIVE") String status) {
        return ApiResponse.ok(releaseService.listReleases(RecordStatusFilter.fromText(status)));
    }

    @GetMapping("/{releaseId}")
    @PreAuthorize("hasAuthority('RELEASE_READ')")
    public ApiResponse<ReleaseResponse> getRelease(@PathVariable UUID releaseId) {
        return ApiResponse.ok(releaseService.getRelease(releaseId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('RELEASE_WRITE')")
    public ApiResponse<ReleaseResponse> createRelease(@Valid @RequestBody ReleaseCreateRequest releaseCreateRequest) {
        ReleaseResponse releaseResponse = releaseService.createRelease(releaseCreateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "RELEASE_CREATED",
                "RELEASE",
                releaseResponse.id().toString(),
                null,
                Map.of("versionLabel", releaseResponse.versionLabel()));
        return ApiResponse.ok(releaseResponse);
    }

    @PutMapping("/{releaseId}")
    @PreAuthorize("hasAuthority('RELEASE_WRITE')")
    public ApiResponse<ReleaseResponse> updateRelease(
            @PathVariable UUID releaseId,
            @Valid @RequestBody ReleaseUpdateRequest releaseUpdateRequest) {
        ReleaseResponse releaseResponse = releaseService.updateRelease(releaseId, releaseUpdateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "RELEASE_UPDATED",
                "RELEASE",
                releaseResponse.id().toString(),
                null,
                Map.of("versionLabel", releaseResponse.versionLabel()));
        return ApiResponse.ok(releaseResponse);
    }

    @PatchMapping("/{releaseId}/archive")
    @PreAuthorize("hasAuthority('RELEASE_WRITE')")
    public ApiResponse<ReleaseResponse> archiveRelease(@PathVariable UUID releaseId) {
        ReleaseResponse releaseResponse = releaseService.archiveRelease(releaseId, currentUserProvider.currentUserId());
        auditService.record(
                currentUserProvider.currentUserId(),
                "RELEASE_ARCHIVED",
                "RELEASE",
                releaseResponse.id().toString(),
                null,
                Map.of("recordStatus", releaseResponse.recordStatus()));
        return ApiResponse.ok(releaseResponse);
    }

    @PostMapping("/{releaseId}/restore")
    @PreAuthorize("hasAuthority('RELEASE_WRITE')")
    public ApiResponse<ReleaseResponse> restoreRelease(@PathVariable UUID releaseId) {
        ReleaseResponse releaseResponse = releaseService.restoreRelease(releaseId);
        auditService.record(
                currentUserProvider.currentUserId(),
                "RELEASE_RESTORED",
                "RELEASE",
                releaseResponse.id().toString(),
                null,
                Map.of("recordStatus", releaseResponse.recordStatus()));
        return ApiResponse.ok(releaseResponse);
    }
}
