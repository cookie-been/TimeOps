package com.timeops.platform.instance.repository;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.instance.DeploymentInstanceEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeploymentInstanceRepository extends JpaRepository<DeploymentInstanceEntity, UUID> {

    List<DeploymentInstanceEntity> findAllByOrderByCreatedAtDesc();

    List<DeploymentInstanceEntity> findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus recordStatus);

    boolean existsByActiveKey(String activeKey);

    boolean existsByCustomerIdAndRecordStatus(UUID customerId, RecordStatus recordStatus);

    boolean existsByTemplateIdAndRecordStatus(UUID templateId, RecordStatus recordStatus);

    boolean existsByPrimaryServerIdAndRecordStatus(UUID primaryServerId, RecordStatus recordStatus);

    boolean existsByCurrentReleaseIdAndRecordStatus(UUID currentReleaseId, RecordStatus recordStatus);

    boolean existsByIdAndRecordStatus(UUID id, RecordStatus recordStatus);
}
