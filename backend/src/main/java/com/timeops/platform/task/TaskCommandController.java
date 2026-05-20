package com.timeops.platform.task;

import com.timeops.platform.audit.AuditService;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.task.dto.AdhocCommandRequest;
import com.timeops.platform.task.dto.BackupTaskRequest;
import com.timeops.platform.task.dto.DeployTaskRequest;
import com.timeops.platform.task.dto.OperationTaskResponse;
import com.timeops.platform.task.dto.RestartTaskRequest;
import com.timeops.platform.task.dto.RollbackTaskRequest;
import com.timeops.platform.task.dto.TaskSubmissionResponse;
import com.timeops.platform.task.dto.UpdateTaskRequest;
import com.timeops.platform.task.dto.VerifyTaskRequest;
import com.timeops.platform.user.UserEntity;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/tasks")
public class TaskCommandController {

    private final OperationTaskService operationTaskService;
    private final TaskEventStreamService taskEventStreamService;
    private final AuditService auditService;

    public TaskCommandController(
            OperationTaskService operationTaskService,
            TaskEventStreamService taskEventStreamService,
            AuditService auditService) {
        this.operationTaskService = operationTaskService;
        this.taskEventStreamService = taskEventStreamService;
        this.auditService = auditService;
    }

    @PostMapping("/adhoc")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createAdhocTask(@Valid @RequestBody AdhocCommandRequest adhocCommandRequest) {
        if (!adhocCommandRequest.riskConfirmed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "risk confirmation required");
        }
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
                adhocCommandRequest.serverId(),
                adhocCommandRequest.command(),
                actorUserId);
        auditService.record(
                actorUserId,
                "ADHOC_COMMAND",
                "SERVER",
                adhocCommandRequest.serverId().toString(),
                operationTaskEntity.getId(),
                Map.of(
                        "command", adhocCommandRequest.command(),
                        "riskConfirmed", adhocCommandRequest.riskConfirmed()));
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/deploy")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createDeployTask(@Valid @RequestBody DeployTaskRequest deployTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueDeploy(
                deployTaskRequest.instanceId(),
                deployTaskRequest.releaseId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "DEPLOY",
                "INSTANCE",
                deployTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of("releaseId", deployTaskRequest.releaseId().toString()));
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/update")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createUpdateTask(@Valid @RequestBody UpdateTaskRequest updateTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueUpdate(
                updateTaskRequest.instanceId(),
                updateTaskRequest.releaseId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "UPDATE",
                "INSTANCE",
                updateTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of("releaseId", updateTaskRequest.releaseId().toString()));
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/backup")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createBackupTask(@Valid @RequestBody BackupTaskRequest backupTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueBackup(
                backupTaskRequest.instanceId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "BACKUP",
                "INSTANCE",
                backupTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of());
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/rollback")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createRollbackTask(@Valid @RequestBody RollbackTaskRequest rollbackTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueRollback(
                rollbackTaskRequest.instanceId(),
                rollbackTaskRequest.releaseId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "ROLLBACK",
                "INSTANCE",
                rollbackTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of("releaseId", rollbackTaskRequest.releaseId().toString()));
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/verify")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createVerifyTask(@Valid @RequestBody VerifyTaskRequest verifyTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueVerify(
                verifyTaskRequest.instanceId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "VERIFY",
                "INSTANCE",
                verifyTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of());
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @PostMapping("/restart")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<TaskSubmissionResponse> createRestartTask(@Valid @RequestBody RestartTaskRequest restartTaskRequest) {
        UUID actorUserId = currentUserId();
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueRestart(
                restartTaskRequest.instanceId(),
                actorUserId);
        auditService.record(
                actorUserId,
                "RESTART",
                "INSTANCE",
                restartTaskRequest.instanceId().toString(),
                operationTaskEntity.getId(),
                Map.of());
        return ApiResponse.ok(toSubmissionResponse(operationTaskEntity));
    }

    @GetMapping
    public ApiResponse<List<OperationTaskResponse>> listTasks() {
        return ApiResponse.ok(operationTaskService.listTasks().stream()
                .map(this::toTaskResponse)
                .toList());
    }

    @GetMapping("/{taskId}")
    public ApiResponse<OperationTaskResponse> getTask(@PathVariable UUID taskId) {
        return ApiResponse.ok(toTaskResponse(operationTaskService.findTask(taskId)));
    }

    @GetMapping(path = "/{taskId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTask(@PathVariable UUID taskId) {
        return taskEventStreamService.streamTask(() -> toTaskResponse(operationTaskService.findTask(taskId)));
    }

    private TaskSubmissionResponse toSubmissionResponse(OperationTaskEntity operationTaskEntity) {
        return new TaskSubmissionResponse(
                operationTaskEntity.getId(),
                operationTaskEntity.getTaskNumber(),
                operationTaskEntity.getStatus().name(),
                operationTaskEntity.getCreatedAt());
    }

    private OperationTaskResponse toTaskResponse(OperationTaskEntity operationTaskEntity) {
        return new OperationTaskResponse(
                operationTaskEntity.getId(),
                operationTaskEntity.getTaskNumber(),
                operationTaskEntity.getTaskType().name(),
                operationTaskEntity.getTargetServerId(),
                operationTaskEntity.getTargetInstanceId(),
                operationTaskEntity.getReleaseId(),
                operationTaskEntity.getStatus().name(),
                operationTaskEntity.getCommandInput(),
                operationTaskEntity.getOutputLog(),
                operationTaskEntity.getErrorLog(),
                operationTaskEntity.getExitCode(),
                operationTaskEntity.getStartedAt(),
                operationTaskEntity.getEndedAt(),
                operationTaskEntity.getCreatedAt()
        );
    }

    private UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity userEntity)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "current user not found");
        }
        return userEntity.getId();
    }
}
