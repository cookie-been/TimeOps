package com.timeops.platform.task;

import com.timeops.platform.instance.DeploymentInstanceEntity;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.server.CredentialCryptoService;
import com.timeops.platform.server.repository.ServerRepository;
import com.timeops.platform.ssh.SshClient;
import com.timeops.platform.ssh.SshExecutionException;
import com.timeops.platform.ssh.SshExecutionResult;
import com.timeops.platform.template.TemplateActionMode;
import com.timeops.platform.template.TemplateActionEntity;
import com.timeops.platform.template.TemplateActionType;
import com.timeops.platform.template.repository.TemplateActionRepository;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OperationTaskService {

    private final OperationTaskRepository operationTaskRepository;
    private final ServerRepository serverRepository;
    private final DeploymentInstanceRepository deploymentInstanceRepository;
    private final ReleaseRepository releaseRepository;
    private final TemplateActionRepository templateActionRepository;
    private final CredentialCryptoService credentialCryptoService;
    private final SshClient sshClient;
    private final TaskExecutionContextFactory taskExecutionContextFactory;
    private final TemplateStepExecutor templateStepExecutor;

    public OperationTaskService(
            OperationTaskRepository operationTaskRepository,
            ServerRepository serverRepository,
            DeploymentInstanceRepository deploymentInstanceRepository,
            ReleaseRepository releaseRepository,
            TemplateActionRepository templateActionRepository,
            CredentialCryptoService credentialCryptoService,
            SshClient sshClient,
            TaskExecutionContextFactory taskExecutionContextFactory,
            TemplateStepExecutor templateStepExecutor) {
        this.operationTaskRepository = operationTaskRepository;
        this.serverRepository = serverRepository;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
        this.releaseRepository = releaseRepository;
        this.templateActionRepository = templateActionRepository;
        this.credentialCryptoService = credentialCryptoService;
        this.sshClient = sshClient;
        this.taskExecutionContextFactory = taskExecutionContextFactory;
        this.templateStepExecutor = templateStepExecutor;
    }

    @Transactional
    public OperationTaskEntity enqueueAdhoc(UUID serverId, String command, UUID initiatorUserId) {
        if (!serverRepository.existsById(serverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "server does not exist");
        }
        return operationTaskRepository.save(new OperationTaskEntity(
                generateTaskNumber(),
                TaskType.ADHOC_COMMAND,
                serverId,
                null,
                null,
                null,
                initiatorUserId,
                command,
                TaskStatus.PENDING
        ));
    }

    @Transactional
    public OperationTaskEntity enqueueDeploy(UUID instanceId, UUID releaseId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, releaseId, initiatorUserId, TemplateActionType.DEPLOY, TaskType.DEPLOY);
    }

    @Transactional
    public OperationTaskEntity enqueueUpdate(UUID instanceId, UUID releaseId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, releaseId, initiatorUserId, TemplateActionType.UPDATE, TaskType.UPDATE);
    }

    @Transactional
    public OperationTaskEntity enqueueBackup(UUID instanceId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, null, initiatorUserId, TemplateActionType.BACKUP, TaskType.BACKUP);
    }

    @Transactional
    public OperationTaskEntity enqueueRollback(UUID instanceId, UUID releaseId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, releaseId, initiatorUserId, TemplateActionType.ROLLBACK, TaskType.ROLLBACK);
    }

    @Transactional
    public OperationTaskEntity enqueueVerify(UUID instanceId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, null, initiatorUserId, TemplateActionType.VERIFY, TaskType.VERIFY);
    }

    @Transactional
    public OperationTaskEntity enqueueRestart(UUID instanceId, UUID initiatorUserId) {
        return enqueueByTemplateAction(instanceId, null, initiatorUserId, TemplateActionType.RESTART, TaskType.RESTART);
    }

    @Transactional
    public void execute(UUID taskId) {
        OperationTaskEntity operationTaskEntity = operationTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task does not exist"));
        TaskExecutionContext taskExecutionContext = taskExecutionContextFactory.create(operationTaskEntity);
        operationTaskEntity.markRunning();
        try {
            SshExecutionResult sshExecutionResult = executeTask(operationTaskEntity, taskExecutionContext);
            operationTaskEntity.markFinished(
                    sshExecutionResult.exitCode(),
                    sshExecutionResult.stdout(),
                    sshExecutionResult.stderr());
        } catch (SshExecutionException exception) {
            operationTaskEntity.markFinished(
                    exception.getExitCode() == null ? 255 : exception.getExitCode(),
                    exception.getStdout(),
                    buildErrorLog(exception));
        } catch (RuntimeException exception) {
            operationTaskEntity.markFinished(
                    255,
                    "",
                    exception.getMessage() == null ? "SSH execution failed" : exception.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<OperationTaskEntity> listTasks() {
        return operationTaskRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public OperationTaskEntity findTask(UUID taskId) {
        return operationTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task does not exist"));
    }

    private OperationTaskEntity enqueueByTemplateAction(
            UUID instanceId,
            UUID releaseId,
            UUID initiatorUserId,
            TemplateActionType templateActionType,
            TaskType taskType) {
        DeploymentInstanceEntity deploymentInstanceEntity = deploymentInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "instance does not exist"));
        if (releaseId != null && !releaseRepository.existsById(releaseId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "release does not exist");
        }
        TemplateActionEntity templateActionEntity = templateActionRepository
                .findFirstByTemplate_IdAndActionTypeOrderByExecutionOrderAsc(
                        deploymentInstanceEntity.getTemplateId(),
                        templateActionType)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "template action does not exist"));
        return operationTaskRepository.save(new OperationTaskEntity(
                generateTaskNumber(),
                taskType,
                deploymentInstanceEntity.getPrimaryServerId(),
                deploymentInstanceEntity.getId(),
                templateActionEntity.getId(),
                releaseId,
                initiatorUserId,
                templateActionEntity.getScriptBody(),
                TaskStatus.PENDING
        ));
    }

    private String generateTaskNumber() {
        return "TASK-%s-%s".formatted(
                OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")),
                UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }

    private SshExecutionResult executeTask(
            OperationTaskEntity operationTaskEntity,
            TaskExecutionContext taskExecutionContext) {
        if (taskExecutionContext.templateAction() != null
                && taskExecutionContext.templateAction().getMode() == TemplateActionMode.STEP) {
            return templateStepExecutor.execute(taskExecutionContext);
        }
        return sshClient.execute(taskExecutionContext.sshTarget(), operationTaskEntity.getCommandInput());
    }

    private String buildErrorLog(SshExecutionException exception) {
        String message = exception.getMessage() == null ? "SSH execution failed" : exception.getMessage();
        if (exception.getStderr().isBlank()) {
            return message;
        }
        return message + System.lineSeparator() + exception.getStderr();
    }
}
