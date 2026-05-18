package com.timeops.platform.task;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.timeops.platform.instance.DeploymentInstanceEntity;
import com.timeops.platform.instance.InstanceConfigMergeService;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.ReleaseEntity;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.server.CredentialCryptoService;
import com.timeops.platform.server.ServerEntity;
import com.timeops.platform.server.repository.ServerRepository;
import com.timeops.platform.ssh.SshTarget;
import com.timeops.platform.template.ProductTemplateEntity;
import com.timeops.platform.template.TemplateActionEntity;
import com.timeops.platform.template.repository.ProductTemplateRepository;
import com.timeops.platform.template.repository.TemplateActionRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class TaskExecutionContextFactory {

    private final ServerRepository serverRepository;
    private final DeploymentInstanceRepository deploymentInstanceRepository;
    private final ReleaseRepository releaseRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final TemplateActionRepository templateActionRepository;
    private final CredentialCryptoService credentialCryptoService;
    private final InstanceConfigMergeService instanceConfigMergeService;

    public TaskExecutionContextFactory(
            ServerRepository serverRepository,
            DeploymentInstanceRepository deploymentInstanceRepository,
            ReleaseRepository releaseRepository,
            ProductTemplateRepository productTemplateRepository,
            TemplateActionRepository templateActionRepository,
            CredentialCryptoService credentialCryptoService,
            InstanceConfigMergeService instanceConfigMergeService) {
        this.serverRepository = serverRepository;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
        this.releaseRepository = releaseRepository;
        this.productTemplateRepository = productTemplateRepository;
        this.templateActionRepository = templateActionRepository;
        this.credentialCryptoService = credentialCryptoService;
        this.instanceConfigMergeService = instanceConfigMergeService;
    }

    public TaskExecutionContext create(OperationTaskEntity operationTaskEntity) {
        DeploymentInstanceEntity deploymentInstanceEntity = loadInstance(operationTaskEntity.getTargetInstanceId());
        ServerEntity serverEntity = resolveServer(operationTaskEntity, deploymentInstanceEntity);
        TemplateActionEntity templateActionEntity = loadTemplateAction(operationTaskEntity.getTemplateActionId());
        ProductTemplateEntity productTemplateEntity = resolveTemplate(deploymentInstanceEntity, templateActionEntity);
        ReleaseEntity releaseEntity = resolveRelease(operationTaskEntity.getReleaseId(), deploymentInstanceEntity);
        ObjectNode mergedConfig = resolveMergedConfig(productTemplateEntity, deploymentInstanceEntity);

        return new TaskExecutionContext(
                operationTaskEntity,
                new SshTarget(
                        serverEntity.getHost(),
                        serverEntity.getSshPort(),
                        serverEntity.getSshUsername(),
                        credentialCryptoService.decrypt(serverEntity.getSshPasswordCipher())),
                templateActionEntity,
                productTemplateEntity,
                deploymentInstanceEntity,
                releaseEntity,
                mergedConfig,
                productTemplateEntity == null ? null : productTemplateEntity.getDefaultWorkDir());
    }

    private DeploymentInstanceEntity loadInstance(UUID instanceId) {
        if (instanceId == null) {
            return null;
        }
        return deploymentInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "instance does not exist"));
    }

    private ServerEntity resolveServer(OperationTaskEntity operationTaskEntity, DeploymentInstanceEntity deploymentInstanceEntity) {
        UUID serverId = operationTaskEntity.getTargetServerId();
        if (serverId == null && deploymentInstanceEntity != null) {
            serverId = deploymentInstanceEntity.getPrimaryServerId();
        }
        if (serverId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "server does not exist");
        }
        UUID finalServerId = serverId;
        return serverRepository.findById(finalServerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "server does not exist"));
    }

    private TemplateActionEntity loadTemplateAction(UUID templateActionId) {
        if (templateActionId == null) {
            return null;
        }
        return templateActionRepository.findById(templateActionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template action does not exist"));
    }

    private ProductTemplateEntity resolveTemplate(
            DeploymentInstanceEntity deploymentInstanceEntity,
            TemplateActionEntity templateActionEntity) {
        UUID templateId = deploymentInstanceEntity == null ? null : deploymentInstanceEntity.getTemplateId();
        if (templateId == null && templateActionEntity != null && templateActionEntity.getTemplateId() != null) {
            templateId = templateActionEntity.getTemplateId();
        }
        if (templateId == null) {
            return null;
        }
        UUID finalTemplateId = templateId;
        return productTemplateRepository.findById(finalTemplateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"));
    }

    private ReleaseEntity resolveRelease(UUID releaseId, DeploymentInstanceEntity deploymentInstanceEntity) {
        UUID targetReleaseId = releaseId;
        if (targetReleaseId == null && deploymentInstanceEntity != null) {
            targetReleaseId = deploymentInstanceEntity.getCurrentReleaseId();
        }
        if (targetReleaseId == null) {
            return null;
        }
        UUID finalReleaseId = targetReleaseId;
        return releaseRepository.findById(finalReleaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "release does not exist"));
    }

    private ObjectNode resolveMergedConfig(
            ProductTemplateEntity productTemplateEntity,
            DeploymentInstanceEntity deploymentInstanceEntity) {
        ObjectNode defaultConfig = asObjectNode(productTemplateEntity == null ? null : productTemplateEntity.getDefaultConfig());
        ObjectNode configOverride = asObjectNode(deploymentInstanceEntity == null ? null : deploymentInstanceEntity.getConfigOverride());
        return instanceConfigMergeService.merge(defaultConfig, configOverride);
    }

    private ObjectNode asObjectNode(JsonNode jsonNode) {
        if (jsonNode == null) {
            return null;
        }
        if (!(jsonNode instanceof ObjectNode objectNode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "config payload must be a JSON object");
        }
        return objectNode;
    }
}
