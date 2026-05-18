package com.timeops.platform.task;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperationTaskRepository extends JpaRepository<OperationTaskEntity, UUID> {

    Optional<OperationTaskEntity> findFirstByStatusOrderByCreatedAtAsc(TaskStatus status);

    List<OperationTaskEntity> findAllByOrderByCreatedAtDesc();
}
