package com.timeops.platform.instance;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.instance.dto.DeploymentInstanceCreateRequest;
import com.timeops.platform.instance.dto.DeploymentInstanceResponse;
import com.timeops.platform.instance.dto.DeploymentInstanceUpdateRequest;
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
@RequestMapping("/api/instances")
public class DeploymentInstanceController {

    private final DeploymentInstanceService deploymentInstanceService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public DeploymentInstanceController(
            DeploymentInstanceService deploymentInstanceService,
            AuditService auditService,
            CurrentUserProvider currentUserProvider) {
        this.deploymentInstanceService = deploymentInstanceService;
        this.auditService = auditService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INSTANCE_READ')")
    public ApiResponse<List<DeploymentInstanceResponse>> listInstances(
            @RequestParam(name = "status", defaultValue = "ACTIVE") String status) {
        return ApiResponse.ok(deploymentInstanceService.listInstances(RecordStatusFilter.fromText(status)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('INSTANCE_WRITE')")
    public ApiResponse<DeploymentInstanceResponse> createInstance(
            @Valid @RequestBody DeploymentInstanceCreateRequest deploymentInstanceCreateRequest) {
        DeploymentInstanceResponse deploymentInstanceResponse =
                deploymentInstanceService.createInstance(deploymentInstanceCreateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "INSTANCE_CREATED",
                "INSTANCE",
                deploymentInstanceResponse.id().toString(),
                null,
                Map.of("instanceName", deploymentInstanceResponse.instanceName()));
        return ApiResponse.ok(deploymentInstanceResponse);
    }

    @GetMapping("/{instanceId}")
    @PreAuthorize("hasAuthority('INSTANCE_READ')")
    public ApiResponse<DeploymentInstanceResponse> getInstance(@PathVariable UUID instanceId) {
        return ApiResponse.ok(deploymentInstanceService.getInstance(instanceId));
    }

    @PutMapping("/{instanceId}")
    @PreAuthorize("hasAuthority('INSTANCE_WRITE')")
    public ApiResponse<DeploymentInstanceResponse> updateInstance(
            @PathVariable UUID instanceId,
            @Valid @RequestBody DeploymentInstanceUpdateRequest deploymentInstanceUpdateRequest) {
        DeploymentInstanceResponse deploymentInstanceResponse =
                deploymentInstanceService.updateInstance(instanceId, deploymentInstanceUpdateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "INSTANCE_UPDATED",
                "INSTANCE",
                deploymentInstanceResponse.id().toString(),
                null,
                Map.of("instanceName", deploymentInstanceResponse.instanceName()));
        return ApiResponse.ok(deploymentInstanceResponse);
    }

    @PatchMapping("/{instanceId}/archive")
    @PreAuthorize("hasAuthority('INSTANCE_WRITE')")
    public ApiResponse<DeploymentInstanceResponse> archiveInstance(@PathVariable UUID instanceId) {
        DeploymentInstanceResponse deploymentInstanceResponse =
                deploymentInstanceService.archiveInstance(instanceId, currentUserProvider.currentUserId());
        auditService.record(
                currentUserProvider.currentUserId(),
                "INSTANCE_ARCHIVED",
                "INSTANCE",
                deploymentInstanceResponse.id().toString(),
                null,
                Map.of("recordStatus", deploymentInstanceResponse.recordStatus()));
        return ApiResponse.ok(deploymentInstanceResponse);
    }

    @PostMapping("/{instanceId}/restore")
    @PreAuthorize("hasAuthority('INSTANCE_WRITE')")
    public ApiResponse<DeploymentInstanceResponse> restoreInstance(@PathVariable UUID instanceId) {
        DeploymentInstanceResponse deploymentInstanceResponse = deploymentInstanceService.restoreInstance(instanceId);
        auditService.record(
                currentUserProvider.currentUserId(),
                "INSTANCE_RESTORED",
                "INSTANCE",
                deploymentInstanceResponse.id().toString(),
                null,
                Map.of("recordStatus", deploymentInstanceResponse.recordStatus()));
        return ApiResponse.ok(deploymentInstanceResponse);
    }
}
