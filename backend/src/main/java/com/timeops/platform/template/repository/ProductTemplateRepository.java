package com.timeops.platform.template.repository;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.template.ProductTemplateEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductTemplateRepository extends JpaRepository<ProductTemplateEntity, UUID> {

    boolean existsByProductCode(String productCode);

    Optional<ProductTemplateEntity> findByProductCode(String productCode);

    List<ProductTemplateEntity> findAllByOrderByCreatedAtDesc();

    List<ProductTemplateEntity> findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus recordStatus);

    boolean existsByActiveKey(String activeKey);

    boolean existsByIdAndRecordStatus(UUID id, RecordStatus recordStatus);
}
