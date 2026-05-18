package com.timeops.platform.template;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.ReleaseSourceType;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.template.dto.ProductTemplateCreateRequest;
import com.timeops.platform.template.dto.ProductTemplateResponse;
import com.timeops.platform.template.dto.ProductTemplateUpdateRequest;
import com.timeops.platform.template.dto.TemplateActionRequest;
import com.timeops.platform.template.dto.TemplateActionResponse;
import com.timeops.platform.template.repository.ProductTemplateRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductTemplateService {

    private final ProductTemplateRepository productTemplateRepository;
    private final ObjectMapper objectMapper;
    private final ReleaseRepository releaseRepository;
    private final DeploymentInstanceRepository deploymentInstanceRepository;

    public ProductTemplateService(
            ProductTemplateRepository productTemplateRepository,
            ObjectMapper objectMapper,
            ReleaseRepository releaseRepository,
            DeploymentInstanceRepository deploymentInstanceRepository) {
        this.productTemplateRepository = productTemplateRepository;
        this.objectMapper = objectMapper;
        this.releaseRepository = releaseRepository;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductTemplateResponse> listTemplates(RecordStatusFilter recordStatusFilter) {
        return loadTemplates(recordStatusFilter).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductTemplateResponse getTemplate(UUID templateId) {
        return toResponse(findTemplate(templateId));
    }

    @Transactional
    public ProductTemplateResponse createTemplate(ProductTemplateCreateRequest productTemplateCreateRequest) {
        ensureActiveKeyAvailable(ProductTemplateEntity.buildActiveKey(productTemplateCreateRequest.productCode()), null);

        ProductTemplateEntity productTemplateEntity = new ProductTemplateEntity(
                productTemplateCreateRequest.name(),
                productTemplateCreateRequest.productCode(),
                productTemplateCreateRequest.supportedReleaseSources().stream()
                        .map(ReleaseSourceType::name)
                        .toList(),
                productTemplateCreateRequest.defaultWorkDir(),
                productTemplateCreateRequest.defaultConfig() == null
                        ? objectMapper.createObjectNode()
                        : productTemplateCreateRequest.defaultConfig(),
                productTemplateCreateRequest.description()
        );
        productTemplateEntity.replaceActions(buildTemplateActions(productTemplateCreateRequest.actions()));

        ProductTemplateEntity savedTemplate = productTemplateRepository.save(productTemplateEntity);
        return toResponse(savedTemplate);
    }

    @Transactional
    public ProductTemplateResponse updateTemplate(UUID templateId, ProductTemplateUpdateRequest productTemplateUpdateRequest) {
        ProductTemplateEntity productTemplateEntity = findTemplate(templateId);
        requireActive(productTemplateEntity, "template is archived");
        String activeKey = ProductTemplateEntity.buildActiveKey(productTemplateUpdateRequest.productCode());
        ensureActiveKeyAvailable(activeKey, productTemplateEntity.getActiveKey());
        productTemplateEntity.update(
                productTemplateUpdateRequest.name(),
                productTemplateUpdateRequest.productCode(),
                productTemplateUpdateRequest.supportedReleaseSources().stream()
                        .map(ReleaseSourceType::name)
                        .toList(),
                productTemplateUpdateRequest.defaultWorkDir(),
                productTemplateUpdateRequest.defaultConfig() == null
                        ? objectMapper.createObjectNode()
                        : productTemplateUpdateRequest.defaultConfig(),
                productTemplateUpdateRequest.description());
        productTemplateEntity.replaceActions(buildTemplateActions(productTemplateUpdateRequest.actions()));
        return toResponse(productTemplateEntity);
    }

    @Transactional
    public ProductTemplateResponse archiveTemplate(UUID templateId, UUID actorUserId) {
        ProductTemplateEntity productTemplateEntity = findTemplate(templateId);
        requireActive(productTemplateEntity, "template is already archived");
        if (releaseRepository.existsByTemplate_IdAndRecordStatus(templateId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "template has active releases");
        }
        if (deploymentInstanceRepository.existsByTemplateIdAndRecordStatus(templateId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "template has active instances");
        }
        productTemplateEntity.archive(actorUserId);
        return toResponse(productTemplateEntity);
    }

    @Transactional
    public ProductTemplateResponse restoreTemplate(UUID templateId) {
        ProductTemplateEntity productTemplateEntity = findTemplate(templateId);
        if (productTemplateEntity.getRecordStatus() == RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "template is already active");
        }
        String activeKey = ProductTemplateEntity.buildActiveKey(productTemplateEntity.getProductCode());
        ensureActiveKeyAvailable(activeKey, null);
        productTemplateEntity.restore(activeKey);
        return toResponse(productTemplateEntity);
    }

    private void validateActionRequest(TemplateActionRequest actionRequest) {
        if (actionRequest.mode() == TemplateActionMode.SCRIPT
                && (actionRequest.scriptBody() == null || actionRequest.scriptBody().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scriptBody must not be blank when mode is SCRIPT");
        }
        if (actionRequest.mode() == TemplateActionMode.STEP && actionRequest.stepDefinition() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepDefinition must not be null when mode is STEP");
        }
    }

    private List<ProductTemplateEntity> loadTemplates(RecordStatusFilter recordStatusFilter) {
        return switch (recordStatusFilter) {
            case ALL -> productTemplateRepository.findAllByOrderByCreatedAtDesc();
            case ACTIVE -> productTemplateRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ACTIVE);
            case ARCHIVED -> productTemplateRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ARCHIVED);
        };
    }

    private ProductTemplateEntity findTemplate(UUID templateId) {
        return productTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template does not exist"));
    }

    private void ensureActiveKeyAvailable(String activeKey, String currentActiveKey) {
        if (activeKey.equals(currentActiveKey)) {
            return;
        }
        if (productTemplateRepository.existsByActiveKey(activeKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "productCode already exists");
        }
    }

    private void requireActive(ProductTemplateEntity productTemplateEntity, String message) {
        if (productTemplateEntity.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private List<TemplateActionEntity> buildTemplateActions(List<TemplateActionRequest> actionRequests) {
        return actionRequests.stream()
                .peek(this::validateActionRequest)
                .map(actionRequest -> new TemplateActionEntity(
                        actionRequest.actionType(),
                        actionRequest.mode(),
                        actionRequest.scriptBody(),
                        actionRequest.stepDefinition()))
                .toList();
    }

    private ProductTemplateResponse toResponse(ProductTemplateEntity productTemplateEntity) {
        return new ProductTemplateResponse(
                productTemplateEntity.getId(),
                productTemplateEntity.getName(),
                productTemplateEntity.getProductCode(),
                productTemplateEntity.getSupportedReleaseSources(),
                productTemplateEntity.getDefaultWorkDir(),
                productTemplateEntity.getDefaultConfig(),
                productTemplateEntity.getDescription(),
                productTemplateEntity.getActions().stream()
                        .map(action -> new TemplateActionResponse(
                                action.getId(),
                                action.getActionType().name(),
                                action.getMode().name(),
                                action.getScriptBody(),
                                action.getStepDefinition(),
                                action.getExecutionOrder()
                        ))
                        .toList(),
                productTemplateEntity.getRecordStatus().name(),
                productTemplateEntity.getArchivedAt()
        );
    }
}
