package com.timeops.platform.instance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.customer.repository.CustomerRepository;
import com.timeops.platform.instance.dto.DeploymentInstanceCreateRequest;
import com.timeops.platform.instance.dto.DeploymentInstanceResponse;
import com.timeops.platform.instance.dto.DeploymentInstanceUpdateRequest;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.server.repository.ServerRepository;
import com.timeops.platform.template.ProductTemplateEntity;
import com.timeops.platform.template.repository.ProductTemplateRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DeploymentInstanceService {

    private final DeploymentInstanceRepository deploymentInstanceRepository;
    private final CustomerRepository customerRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final ServerRepository serverRepository;
    private final ReleaseRepository releaseRepository;
    private final InstanceConfigMergeService instanceConfigMergeService;
    private final ObjectMapper objectMapper;

    public DeploymentInstanceService(
            DeploymentInstanceRepository deploymentInstanceRepository,
            CustomerRepository customerRepository,
            ProductTemplateRepository productTemplateRepository,
            ServerRepository serverRepository,
            ReleaseRepository releaseRepository,
            InstanceConfigMergeService instanceConfigMergeService,
            ObjectMapper objectMapper) {
        this.deploymentInstanceRepository = deploymentInstanceRepository;
        this.customerRepository = customerRepository;
        this.productTemplateRepository = productTemplateRepository;
        this.serverRepository = serverRepository;
        this.releaseRepository = releaseRepository;
        this.instanceConfigMergeService = instanceConfigMergeService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<DeploymentInstanceResponse> listInstances(RecordStatusFilter recordStatusFilter) {
        return loadInstances(recordStatusFilter).stream()
                .map(deploymentInstanceEntity -> toResponse(
                        deploymentInstanceEntity,
                        productTemplateRepository.findById(deploymentInstanceEntity.getTemplateId())
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"))))
                .toList();
    }

    @Transactional
    public DeploymentInstanceResponse createInstance(DeploymentInstanceCreateRequest deploymentInstanceCreateRequest) {
        validateCreateRequest(deploymentInstanceCreateRequest);
        ProductTemplateEntity productTemplateEntity = productTemplateRepository.findById(deploymentInstanceCreateRequest.templateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist"));
        ensureActiveKeyAvailable(
                DeploymentInstanceEntity.buildActiveKey(
                        deploymentInstanceCreateRequest.customerId(),
                        deploymentInstanceCreateRequest.instanceName()),
                null);

        DeploymentInstanceEntity deploymentInstanceEntity = new DeploymentInstanceEntity(
                deploymentInstanceCreateRequest.customerId(),
                deploymentInstanceCreateRequest.templateId(),
                deploymentInstanceCreateRequest.primaryServerId(),
                deploymentInstanceCreateRequest.instanceName(),
                deploymentInstanceCreateRequest.environmentLabel(),
                null,
                DeploymentInstanceStatus.DRAFT,
                deploymentInstanceCreateRequest.configOverride() == null
                        ? objectMapper.createObjectNode()
                        : deploymentInstanceCreateRequest.configOverride(),
                deploymentInstanceCreateRequest.notes()
        );
        DeploymentInstanceEntity savedInstance = deploymentInstanceRepository.save(deploymentInstanceEntity);
        return toResponse(savedInstance, productTemplateEntity);
    }

    @Transactional(readOnly = true)
    public DeploymentInstanceResponse getInstance(UUID instanceId) {
        DeploymentInstanceEntity deploymentInstanceEntity = deploymentInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "instance does not exist"));
        ProductTemplateEntity productTemplateEntity = productTemplateRepository.findById(deploymentInstanceEntity.getTemplateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"));
        return toResponse(deploymentInstanceEntity, productTemplateEntity);
    }

    @Transactional
    public DeploymentInstanceResponse updateInstance(UUID instanceId, DeploymentInstanceUpdateRequest deploymentInstanceUpdateRequest) {
        DeploymentInstanceEntity deploymentInstanceEntity = findInstance(instanceId);
        requireActive(deploymentInstanceEntity, "instance is archived");
        validateUpdateRequest(deploymentInstanceUpdateRequest);
        String activeKey = DeploymentInstanceEntity.buildActiveKey(
                deploymentInstanceUpdateRequest.customerId(),
                deploymentInstanceUpdateRequest.instanceName());
        ensureActiveKeyAvailable(activeKey, deploymentInstanceEntity.getActiveKey());
        deploymentInstanceEntity.update(
                deploymentInstanceUpdateRequest.customerId(),
                deploymentInstanceUpdateRequest.templateId(),
                deploymentInstanceUpdateRequest.primaryServerId(),
                deploymentInstanceUpdateRequest.instanceName(),
                deploymentInstanceUpdateRequest.environmentLabel(),
                deploymentInstanceUpdateRequest.configOverride() == null
                        ? objectMapper.createObjectNode()
                        : deploymentInstanceUpdateRequest.configOverride(),
                deploymentInstanceUpdateRequest.notes());
        ProductTemplateEntity productTemplateEntity = productTemplateRepository.findById(deploymentInstanceUpdateRequest.templateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist"));
        return toResponse(deploymentInstanceEntity, productTemplateEntity);
    }

    @Transactional
    public DeploymentInstanceResponse archiveInstance(UUID instanceId, UUID actorUserId) {
        DeploymentInstanceEntity deploymentInstanceEntity = findInstance(instanceId);
        requireActive(deploymentInstanceEntity, "instance is already archived");
        deploymentInstanceEntity.archive(actorUserId);
        ProductTemplateEntity productTemplateEntity = productTemplateRepository.findById(deploymentInstanceEntity.getTemplateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"));
        return toResponse(deploymentInstanceEntity, productTemplateEntity);
    }

    @Transactional
    public DeploymentInstanceResponse restoreInstance(UUID instanceId) {
        DeploymentInstanceEntity deploymentInstanceEntity = findInstance(instanceId);
        if (deploymentInstanceEntity.getRecordStatus() == RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "instance is already active");
        }
        validateRestoreDependencies(deploymentInstanceEntity);
        String activeKey = DeploymentInstanceEntity.buildActiveKey(
                deploymentInstanceEntity.getCustomerId(),
                deploymentInstanceEntity.getInstanceName());
        ensureActiveKeyAvailable(activeKey, null);
        deploymentInstanceEntity.restore(activeKey);
        ProductTemplateEntity productTemplateEntity = productTemplateRepository.findById(deploymentInstanceEntity.getTemplateId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"));
        return toResponse(deploymentInstanceEntity, productTemplateEntity);
    }

    private void validateCreateRequest(DeploymentInstanceCreateRequest deploymentInstanceCreateRequest) {
        if (!customerRepository.existsByIdAndRecordStatus(deploymentInstanceCreateRequest.customerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        if (!productTemplateRepository.existsByIdAndRecordStatus(deploymentInstanceCreateRequest.templateId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist");
        }
        if (!serverRepository.existsByIdAndRecordStatus(deploymentInstanceCreateRequest.primaryServerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "primary server does not exist");
        }
    }

    private void validateUpdateRequest(DeploymentInstanceUpdateRequest deploymentInstanceUpdateRequest) {
        if (!customerRepository.existsByIdAndRecordStatus(deploymentInstanceUpdateRequest.customerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        if (!productTemplateRepository.existsByIdAndRecordStatus(deploymentInstanceUpdateRequest.templateId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist");
        }
        if (!serverRepository.existsByIdAndRecordStatus(deploymentInstanceUpdateRequest.primaryServerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "primary server does not exist");
        }
    }

    private void validateRestoreDependencies(DeploymentInstanceEntity deploymentInstanceEntity) {
        if (!customerRepository.existsByIdAndRecordStatus(deploymentInstanceEntity.getCustomerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        if (!productTemplateRepository.existsByIdAndRecordStatus(deploymentInstanceEntity.getTemplateId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist");
        }
        if (!serverRepository.existsByIdAndRecordStatus(deploymentInstanceEntity.getPrimaryServerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "primary server does not exist");
        }
        if (deploymentInstanceEntity.getCurrentReleaseId() != null
                && !releaseRepository.existsByIdAndRecordStatus(deploymentInstanceEntity.getCurrentReleaseId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "current release does not exist");
        }
    }

    private DeploymentInstanceResponse toResponse(
            DeploymentInstanceEntity deploymentInstanceEntity,
            ProductTemplateEntity productTemplateEntity) {
        if (deploymentInstanceEntity.getCurrentReleaseId() != null
                && !releaseRepository.existsById(deploymentInstanceEntity.getCurrentReleaseId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "current release does not exist");
        }
        ObjectNode mergedConfig = instanceConfigMergeService.merge(
                productTemplateEntity.getDefaultConfig().deepCopy(),
                deploymentInstanceEntity.getConfigOverride().deepCopy());
        return new DeploymentInstanceResponse(
                deploymentInstanceEntity.getId(),
                deploymentInstanceEntity.getInstanceName(),
                deploymentInstanceEntity.getEnvironmentLabel(),
                deploymentInstanceEntity.getCustomerId(),
                deploymentInstanceEntity.getTemplateId(),
                deploymentInstanceEntity.getPrimaryServerId(),
                deploymentInstanceEntity.getCurrentReleaseId(),
                deploymentInstanceEntity.getStatus().name(),
                deploymentInstanceEntity.getConfigOverride(),
                mergedConfig,
                deploymentInstanceEntity.getNotes(),
                deploymentInstanceEntity.getRecordStatus().name(),
                deploymentInstanceEntity.getArchivedAt()
        );
    }

    private List<DeploymentInstanceEntity> loadInstances(RecordStatusFilter recordStatusFilter) {
        return switch (recordStatusFilter) {
            case ALL -> deploymentInstanceRepository.findAllByOrderByCreatedAtDesc();
            case ACTIVE -> deploymentInstanceRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ACTIVE);
            case ARCHIVED -> deploymentInstanceRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ARCHIVED);
        };
    }

    private DeploymentInstanceEntity findInstance(UUID instanceId) {
        return deploymentInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "instance does not exist"));
    }

    private void ensureActiveKeyAvailable(String activeKey, String currentActiveKey) {
        if (activeKey.equals(currentActiveKey)) {
            return;
        }
        if (deploymentInstanceRepository.existsByActiveKey(activeKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "instance name already exists");
        }
    }

    private void requireActive(DeploymentInstanceEntity deploymentInstanceEntity, String message) {
        if (deploymentInstanceEntity.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }
}
