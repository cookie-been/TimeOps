package com.timeops.platform.template.repository;

import com.timeops.platform.template.TemplateActionEntity;
import com.timeops.platform.template.TemplateActionType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateActionRepository extends JpaRepository<TemplateActionEntity, UUID> {

    Optional<TemplateActionEntity> findFirstByTemplate_IdAndActionTypeOrderByExecutionOrderAsc(
            UUID templateId,
            TemplateActionType actionType);
}
