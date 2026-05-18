package com.timeops.platform.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.common.jpa.JsonNodeTextConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "audit_log")
public class AuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_user_id", nullable = false)
    private UUID actorUserId;

    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    @Column(name = "target_type", nullable = false, length = 50)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(name = "task_id")
    private UUID taskId;

    @Convert(converter = JsonNodeTextConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private JsonNode detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected AuditLogEntity() {
    }

    public AuditLogEntity(
            UUID actorUserId,
            String actionType,
            String targetType,
            String targetId,
            UUID taskId,
            JsonNode detail) {
        this.actorUserId = actorUserId;
        this.actionType = actionType;
        this.targetType = targetType;
        this.targetId = targetId;
        this.taskId = taskId;
        this.detail = detail;
    }

    public UUID getId() {
        return id;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public String getActionType() {
        return actionType;
    }

    public String getTargetType() {
        return targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public JsonNode getDetail() {
        return detail;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
