package com.timeops.platform.task;

import java.util.Optional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TaskWorker {

    private final OperationTaskRepository operationTaskRepository;
    private final OperationTaskService operationTaskService;

    public TaskWorker(
            OperationTaskRepository operationTaskRepository,
            OperationTaskService operationTaskService) {
        this.operationTaskRepository = operationTaskRepository;
        this.operationTaskService = operationTaskService;
    }

    @Scheduled(fixedDelay = 2000)
    public void executePendingTask() {
        Optional<OperationTaskEntity> pendingTask = operationTaskRepository.findFirstByStatusOrderByCreatedAtAsc(TaskStatus.PENDING);
        pendingTask.ifPresent(task -> operationTaskService.execute(task.getId()));
    }
}
