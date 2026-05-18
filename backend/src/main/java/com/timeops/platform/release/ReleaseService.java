package com.timeops.platform.release;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.dto.ReleaseCreateRequest;
import com.timeops.platform.release.dto.ReleaseResponse;
import com.timeops.platform.release.dto.ReleaseUpdateRequest;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.security.CurrentUserProvider;
import com.timeops.platform.template.ProductTemplateEntity;
import com.timeops.platform.template.repository.ProductTemplateRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReleaseService {

    private final ReleaseRepository releaseRepository;
    private final ProductTemplateRepository productTemplateRepository;
    private final CurrentUserProvider currentUserProvider;
    private final DeploymentInstanceRepository deploymentInstanceRepository;

    public ReleaseService(
            ReleaseRepository releaseRepository,
            ProductTemplateRepository productTemplateRepository,
            CurrentUserProvider currentUserProvider,
            DeploymentInstanceRepository deploymentInstanceRepository) {
        this.releaseRepository = releaseRepository;
        this.productTemplateRepository = productTemplateRepository;
        this.currentUserProvider = currentUserProvider;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
    }

    @Transactional(readOnly = true)
    public List<ReleaseResponse> listReleases(RecordStatusFilter recordStatusFilter) {
        return loadReleases(recordStatusFilter).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReleaseResponse getRelease(UUID releaseId) {
        return toResponse(findRelease(releaseId));
    }

    @Transactional
    public ReleaseResponse createRelease(ReleaseCreateRequest releaseCreateRequest) {
        ProductTemplateEntity productTemplateEntity = findActiveTemplate(releaseCreateRequest.templateId());
        validateTemplateSupport(productTemplateEntity, releaseCreateRequest.sourceType());
        validateSourceSpecificFields(releaseCreateRequest);
        ensureActiveKeyAvailable(ReleaseEntity.buildActiveKey(productTemplateEntity.getId(), releaseCreateRequest.versionLabel()), null);

        ReleaseEntity releaseEntity = new ReleaseEntity(
                productTemplateEntity,
                releaseCreateRequest.versionLabel(),
                releaseCreateRequest.sourceType(),
                releaseCreateRequest.repositoryUrl(),
                releaseCreateRequest.gitRef(),
                releaseCreateRequest.packageUri(),
                releaseCreateRequest.changelog(),
                currentUserProvider.currentUserId()
        );
        ReleaseEntity savedRelease = releaseRepository.save(releaseEntity);
        return toResponse(savedRelease);
    }

    @Transactional
    public ReleaseResponse updateRelease(UUID releaseId, ReleaseUpdateRequest releaseUpdateRequest) {
        ReleaseEntity releaseEntity = findRelease(releaseId);
        requireActive(releaseEntity, "release is archived");
        ProductTemplateEntity productTemplateEntity = findActiveTemplate(releaseUpdateRequest.templateId());
        validateTemplateSupport(productTemplateEntity, releaseUpdateRequest.sourceType());
        validateSourceSpecificFields(releaseUpdateRequest);
        String activeKey = ReleaseEntity.buildActiveKey(productTemplateEntity.getId(), releaseUpdateRequest.versionLabel());
        ensureActiveKeyAvailable(activeKey, releaseEntity.getActiveKey());
        releaseEntity.update(
                productTemplateEntity,
                releaseUpdateRequest.versionLabel(),
                releaseUpdateRequest.sourceType(),
                releaseUpdateRequest.repositoryUrl(),
                releaseUpdateRequest.gitRef(),
                releaseUpdateRequest.packageUri(),
                releaseUpdateRequest.changelog());
        return toResponse(releaseEntity);
    }

    @Transactional
    public ReleaseResponse archiveRelease(UUID releaseId, UUID actorUserId) {
        ReleaseEntity releaseEntity = findRelease(releaseId);
        requireActive(releaseEntity, "release is already archived");
        if (deploymentInstanceRepository.existsByCurrentReleaseIdAndRecordStatus(releaseId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "release is used by active instances");
        }
        releaseEntity.archive(actorUserId);
        return toResponse(releaseEntity);
    }

    @Transactional
    public ReleaseResponse restoreRelease(UUID releaseId) {
        ReleaseEntity releaseEntity = findRelease(releaseId);
        if (releaseEntity.getRecordStatus() == RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "release is already active");
        }
        ProductTemplateEntity productTemplateEntity = findActiveTemplate(releaseEntity.getTemplate().getId());
        String activeKey = ReleaseEntity.buildActiveKey(productTemplateEntity.getId(), releaseEntity.getVersionLabel());
        ensureActiveKeyAvailable(activeKey, null);
        releaseEntity.restore(activeKey);
        return toResponse(releaseEntity);
    }

    private void validateSourceSpecificFields(ReleaseCreateRequest releaseCreateRequest) {
        if (releaseCreateRequest.sourceType() == ReleaseSourceType.GIT) {
            if (releaseCreateRequest.repositoryUrl() == null || releaseCreateRequest.repositoryUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "repositoryUrl must not be blank when sourceType is GIT");
            }
            if (releaseCreateRequest.gitRef() == null || releaseCreateRequest.gitRef().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "gitRef must not be blank when sourceType is GIT");
            }
            return;
        }
        if (releaseCreateRequest.packageUri() == null || releaseCreateRequest.packageUri().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "packageUri must not be blank when sourceType is PACKAGE");
        }
    }

    private void validateSourceSpecificFields(ReleaseUpdateRequest releaseUpdateRequest) {
        if (releaseUpdateRequest.sourceType() == ReleaseSourceType.GIT) {
            if (releaseUpdateRequest.repositoryUrl() == null || releaseUpdateRequest.repositoryUrl().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "repositoryUrl must not be blank when sourceType is GIT");
            }
            if (releaseUpdateRequest.gitRef() == null || releaseUpdateRequest.gitRef().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "gitRef must not be blank when sourceType is GIT");
            }
            return;
        }
        if (releaseUpdateRequest.packageUri() == null || releaseUpdateRequest.packageUri().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "packageUri must not be blank when sourceType is PACKAGE");
        }
    }

    private List<ReleaseEntity> loadReleases(RecordStatusFilter recordStatusFilter) {
        return switch (recordStatusFilter) {
            case ALL -> releaseRepository.findAllByOrderByCreatedAtDesc();
            case ACTIVE -> releaseRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ACTIVE);
            case ARCHIVED -> releaseRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ARCHIVED);
        };
    }

    private ReleaseEntity findRelease(UUID releaseId) {
        return releaseRepository.findById(releaseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "release does not exist"));
    }

    private ProductTemplateEntity findActiveTemplate(UUID templateId) {
        if (!productTemplateRepository.existsByIdAndRecordStatus(templateId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist");
        }
        return productTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "template does not exist"));
    }

    private void validateTemplateSupport(ProductTemplateEntity productTemplateEntity, ReleaseSourceType releaseSourceType) {
        if (!productTemplateEntity.getSupportedReleaseSources().contains(releaseSourceType.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceType is not supported by template");
        }
    }

    private void ensureActiveKeyAvailable(String activeKey, String currentActiveKey) {
        if (activeKey.equals(currentActiveKey)) {
            return;
        }
        if (releaseRepository.existsByActiveKey(activeKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "release version already exists");
        }
    }

    private void requireActive(ReleaseEntity releaseEntity, String message) {
        if (releaseEntity.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private ReleaseResponse toResponse(ReleaseEntity releaseEntity) {
        return new ReleaseResponse(
                releaseEntity.getId(),
                releaseEntity.getTemplate().getId(),
                releaseEntity.getVersionLabel(),
                releaseEntity.getSourceType().name(),
                releaseEntity.getRepositoryUrl(),
                releaseEntity.getGitRef(),
                releaseEntity.getPackageUri(),
                releaseEntity.getChangelog(),
                releaseEntity.getCreatedBy(),
                releaseEntity.getCreatedAt(),
                releaseEntity.getRecordStatus().name(),
                releaseEntity.getArchivedAt()
        );
    }
}
