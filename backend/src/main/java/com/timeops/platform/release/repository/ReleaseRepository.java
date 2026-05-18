package com.timeops.platform.release.repository;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.release.ReleaseEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReleaseRepository extends JpaRepository<ReleaseEntity, UUID> {

    List<ReleaseEntity> findAllByOrderByCreatedAtDesc();

    List<ReleaseEntity> findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus recordStatus);

    boolean existsByActiveKey(String activeKey);

    boolean existsByTemplate_IdAndRecordStatus(UUID templateId, RecordStatus recordStatus);

    boolean existsByIdAndRecordStatus(UUID id, RecordStatus recordStatus);
}
