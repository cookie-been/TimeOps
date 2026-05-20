package com.timeops.platform.task;

import com.timeops.platform.task.dto.OperationTaskResponse;
import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class TaskEventStreamService {

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    public SseEmitter streamTask(Supplier<OperationTaskResponse> taskSupplier) {
        SseEmitter emitter = new SseEmitter(0L);
        AtomicReference<ScheduledFuture<?>> futureRef = new AtomicReference<>();

        Runnable emitTaskSnapshot = () -> {
            try {
                OperationTaskResponse taskResponse = taskSupplier.get();
                emitter.send(SseEmitter.event()
                        .name("task")
                        .data(taskResponse));
                if (!isRunning(taskResponse.status())) {
                    cancelScheduledFuture(futureRef.get());
                    emitter.complete();
                }
            } catch (Exception exception) {
                cancelScheduledFuture(futureRef.get());
                emitter.completeWithError(exception);
            }
        };

        ScheduledFuture<?> scheduledFuture = scheduler.scheduleAtFixedRate(
                emitTaskSnapshot,
                0,
                1,
                TimeUnit.SECONDS);
        futureRef.set(scheduledFuture);

        emitter.onCompletion(() -> cancelScheduledFuture(futureRef.get()));
        emitter.onTimeout(() -> {
            cancelScheduledFuture(futureRef.get());
            emitter.complete();
        });
        emitter.onError(error -> cancelScheduledFuture(futureRef.get()));

        return emitter;
    }

    @PreDestroy
    void destroy() {
        scheduler.shutdownNow();
    }

    private boolean isRunning(String status) {
        return TaskStatus.PENDING.name().equals(status) || TaskStatus.RUNNING.name().equals(status);
    }

    private void cancelScheduledFuture(ScheduledFuture<?> scheduledFuture) {
        if (scheduledFuture != null) {
            scheduledFuture.cancel(false);
        }
    }
}
