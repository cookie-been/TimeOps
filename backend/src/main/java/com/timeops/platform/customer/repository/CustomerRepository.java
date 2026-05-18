package com.timeops.platform.customer.repository;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.customer.CustomerEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<CustomerEntity, UUID> {

    List<CustomerEntity> findAllByOrderByCreatedAtDesc();

    List<CustomerEntity> findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus recordStatus);

    boolean existsByActiveKey(String activeKey);

    boolean existsByIdAndRecordStatus(UUID id, RecordStatus recordStatus);
}
