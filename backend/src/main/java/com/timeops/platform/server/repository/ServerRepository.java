package com.timeops.platform.server.repository;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.server.ServerEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServerRepository extends JpaRepository<ServerEntity, UUID> {

    Optional<ServerEntity> findByHost(String host);

    List<ServerEntity> findAllByOrderByCreatedAtDesc();

    List<ServerEntity> findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus recordStatus);

    boolean existsByActiveKey(String activeKey);

    boolean existsByCustomerIdAndRecordStatus(UUID customerId, RecordStatus recordStatus);

    boolean existsByIdAndRecordStatus(UUID id, RecordStatus recordStatus);
}
