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
import org.springframework.transaction.support.TransactionTemplate;
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
    private final TransactionTemplate transactionTemplate;

    public OperationTaskService(
            OperationTaskRepository operationTaskRepository,
            ServerRepository serverRepository,
            DeploymentInstanceRepository deploymentInstanceRepository,
            ReleaseRepository releaseRepository,
            TemplateActionRepository templateActionRepository,
            CredentialCryptoService credentialCryptoService,
            SshClient sshClient,
            TaskExecutionContextFactory taskExecutionContextFactory,
            TemplateStepExecutor templateStepExecutor,
            TransactionTemplate transactionTemplate) {
        this.operationTaskRepository = operationTaskRepository;
        this.serverRepository = serverRepository;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
        this.releaseRepository = releaseRepository;
        this.templateActionRepository = templateActionRepository;
        this.credentialCryptoService = credentialCryptoService;
        this.sshClient = sshClient;
        this.taskExecutionContextFactory = taskExecutionContextFactory;
        this.templateStepExecutor = templateStepExecutor;
        this.transactionTemplate = transactionTemplate;
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

    public void execute(UUID taskId) {
        // Phase 1: load entity and mark RUNNING (short transaction)
        OperationTaskEntity operationTaskEntity = transactionTemplate.execute(status -> {
            OperationTaskEntity entity = operationTaskRepository.findById(taskId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task does not exist"));
            entity.markRunning();
            return entity;
        });

        // Phase 2: SSH execution (no transaction — may run for up to 30 minutes)
        TaskExecutionContext taskExecutionContext = taskExecutionContextFactory.create(operationTaskEntity);
        int exitCode;
        String stdout;
        String stderr;
        try {
            SshExecutionResult sshExecutionResult = executeTask(operationTaskEntity, taskExecutionContext);
            exitCode = sshExecutionResult.exitCode();
            stdout = sshExecutionResult.stdout();
            stderr = sshExecutionResult.stderr();
        } catch (SshExecutionException exception) {
            exitCode = exception.getExitCode() == null ? 255 : exception.getExitCode();
            stdout = exception.getStdout();
            stderr = buildErrorLog(exception);
        } catch (RuntimeException exception) {
            exitCode = 255;
            stdout = "";
            stderr = exception.getMessage() == null ? "SSH execution failed" : exception.getMessage();
        }

        // Phase 3: persist result (short transaction)
        int finalExitCode = exitCode;
        String finalStdout = stdout;
        String finalStderr = stderr;
        transactionTemplate.executeWithoutResult(status -> {
            OperationTaskEntity entity = operationTaskRepository.findById(taskId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task does not exist"));
            entity.markFinished(finalExitCode, finalStdout, finalStderr);
        });
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
        if (exception.getStderr() == null || exception.getStderr().isBlank()) {
            return message;
        }
        return message + System.lineSeparator() + exception.getStderr();
    }
}
