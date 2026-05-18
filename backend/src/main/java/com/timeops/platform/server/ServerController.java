package com.timeops.platform.server;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.server.dto.ServerCreateRequest;
import com.timeops.platform.server.dto.ServerResponse;
import com.timeops.platform.server.dto.ServerSummaryResponse;
import com.timeops.platform.server.dto.ServerUpdateRequest;
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
@RequestMapping("/api/servers")
public class ServerController {

    private final ServerService serverService;
    private final AuditService auditService;
    private final CurrentUserProvider currentUserProvider;

    public ServerController(
            ServerService serverService,
            AuditService auditService,
            CurrentUserProvider currentUserProvider) {
        this.serverService = serverService;
        this.auditService = auditService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('SERVER_WRITE')")
    public ApiResponse<ServerResponse> createServer(@Valid @RequestBody ServerCreateRequest serverCreateRequest) {
        ServerResponse serverResponse = serverService.createServer(serverCreateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "SERVER_CREATED",
                "SERVER",
                serverResponse.id().toString(),
                null,
                Map.of("host", serverResponse.host(), "sshPort", serverResponse.sshPort()));
        return ApiResponse.ok(serverResponse);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SERVER_READ')")
    public ApiResponse<List<ServerSummaryResponse>> listServers(
            @RequestParam(name = "status", defaultValue = "ACTIVE") String status) {
        return ApiResponse.ok(serverService.listServers(RecordStatusFilter.fromText(status)));
    }

    @GetMapping("/{serverId}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    public ApiResponse<ServerSummaryResponse> getServer(@PathVariable UUID serverId) {
        return ApiResponse.ok(serverService.getServer(serverId));
    }

    @PutMapping("/{serverId}")
    @PreAuthorize("hasAuthority('SERVER_WRITE')")
    public ApiResponse<ServerSummaryResponse> updateServer(
            @PathVariable UUID serverId,
            @Valid @RequestBody ServerUpdateRequest serverUpdateRequest) {
        ServerSummaryResponse serverResponse = serverService.updateServer(serverId, serverUpdateRequest);
        auditService.record(
                currentUserProvider.currentUserId(),
                "SERVER_UPDATED",
                "SERVER",
                serverResponse.id().toString(),
                null,
                Map.of("host", serverResponse.host(), "sshPort", serverResponse.sshPort()));
        return ApiResponse.ok(serverResponse);
    }

    @PatchMapping("/{serverId}/archive")
    @PreAuthorize("hasAuthority('SERVER_WRITE')")
    public ApiResponse<ServerSummaryResponse> archiveServer(@PathVariable UUID serverId) {
        ServerSummaryResponse serverResponse = serverService.archiveServer(serverId, currentUserProvider.currentUserId());
        auditService.record(
                currentUserProvider.currentUserId(),
                "SERVER_ARCHIVED",
                "SERVER",
                serverResponse.id().toString(),
                null,
                Map.of("recordStatus", serverResponse.recordStatus()));
        return ApiResponse.ok(serverResponse);
    }

    @PostMapping("/{serverId}/restore")
    @PreAuthorize("hasAuthority('SERVER_WRITE')")
    public ApiResponse<ServerSummaryResponse> restoreServer(@PathVariable UUID serverId) {
        ServerSummaryResponse serverResponse = serverService.restoreServer(serverId);
        auditService.record(
                currentUserProvider.currentUserId(),
                "SERVER_RESTORED",
                "SERVER",
                serverResponse.id().toString(),
                null,
                Map.of("recordStatus", serverResponse.recordStatus()));
        return ApiResponse.ok(serverResponse);
    }
}
