package com.timeops.platform.task;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "operation_task")
public class OperationTaskEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "task_number", nullable = false, unique = true, length = 50)
    private String taskNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 30)
    private TaskType taskType;

    @Column(name = "target_server_id")
    private UUID targetServerId;

    @Column(name = "target_instance_id")
    private UUID targetInstanceId;

    @Column(name = "template_action_id")
    private UUID templateActionId;

    @Column(name = "release_id")
    private UUID releaseId;

    @Column(name = "initiator_user_id", nullable = false)
    private UUID initiatorUserId;

    @Column(name = "command_input", columnDefinition = "TEXT")
    private String commandInput;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status;

    @Column(name = "output_log", columnDefinition = "TEXT")
    private String outputLog;

    @Column(name = "error_log", columnDefinition = "TEXT")
    private String errorLog;

    @Column(name = "exit_code")
    private Integer exitCode;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected OperationTaskEntity() {
    }

    public OperationTaskEntity(
            String taskNumber,
            TaskType taskType,
            UUID targetServerId,
            UUID targetInstanceId,
            UUID templateActionId,
            UUID releaseId,
            UUID initiatorUserId,
            String commandInput,
            TaskStatus status) {
        this.taskNumber = taskNumber;
        this.taskType = taskType;
        this.targetServerId = targetServerId;
        this.targetInstanceId = targetInstanceId;
        this.templateActionId = templateActionId;
        this.releaseId = releaseId;
        this.initiatorUserId = initiatorUserId;
        this.commandInput = commandInput;
        this.status = status;
    }

    public void markRunning() {
        this.status = TaskStatus.RUNNING;
        this.startedAt = OffsetDateTime.now();
    }

    public void markFinished(int exitCode, String outputLog, String errorLog) {
        this.exitCode = exitCode;
        this.outputLog = outputLog;
        this.errorLog = errorLog;
        this.status = exitCode == 0 ? TaskStatus.SUCCESS : TaskStatus.FAILED;
        this.endedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getTaskNumber() {
        return taskNumber;
    }

    public TaskType getTaskType() {
        return taskType;
    }

    public UUID getTargetServerId() {
        return targetServerId;
    }

    public UUID getTargetInstanceId() {
        return targetInstanceId;
    }

    public UUID getTemplateActionId() {
        return templateActionId;
    }

    public UUID getReleaseId() {
        return releaseId;
    }

    public UUID getInitiatorUserId() {
        return initiatorUserId;
    }

    public String getCommandInput() {
        return commandInput;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public String getOutputLog() {
        return outputLog;
    }

    public String getErrorLog() {
        return errorLog;
    }

    public Integer getExitCode() {
        return exitCode;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public OffsetDateTime getEndedAt() {
        return endedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
