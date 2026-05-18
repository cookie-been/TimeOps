package com.timeops.platform.instance;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.common.jpa.AbstractArchivableEntity;
import com.timeops.platform.common.jpa.JsonNodeTextConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "deployment_instance")
public class DeploymentInstanceEntity extends AbstractArchivableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "primary_server_id", nullable = false)
    private UUID primaryServerId;

    @Column(name = "instance_name", nullable = false, length = 200)
    private String instanceName;

    @Column(name = "environment_label", nullable = false, length = 50)
    private String environmentLabel;

    @Column(name = "current_release_id")
    private UUID currentReleaseId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DeploymentInstanceStatus status;

    @Convert(converter = JsonNodeTextConverter.class)
    @Column(name = "config_override", nullable = false, columnDefinition = "TEXT")
    private JsonNode configOverride;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected DeploymentInstanceEntity() {
    }

    public DeploymentInstanceEntity(
            UUID customerId,
            UUID templateId,
            UUID primaryServerId,
            String instanceName,
            String environmentLabel,
            UUID currentReleaseId,
            DeploymentInstanceStatus status,
            JsonNode configOverride,
            String notes) {
        super(buildActiveKey(customerId, instanceName));
        this.customerId = customerId;
        this.templateId = templateId;
        this.primaryServerId = primaryServerId;
        this.instanceName = instanceName;
        this.environmentLabel = environmentLabel;
        this.currentReleaseId = currentReleaseId;
        this.status = status;
        this.configOverride = configOverride;
        this.notes = notes;
    }

    public void update(
            UUID customerId,
            UUID templateId,
            UUID primaryServerId,
            String instanceName,
            String environmentLabel,
            JsonNode configOverride,
            String notes) {
        this.customerId = customerId;
        this.templateId = templateId;
        this.primaryServerId = primaryServerId;
        this.instanceName = instanceName;
        this.environmentLabel = environmentLabel;
        this.configOverride = configOverride;
        this.notes = notes;
        refreshActiveKey(buildActiveKey(customerId, instanceName));
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public UUID getTemplateId() {
        return templateId;
    }

    public UUID getPrimaryServerId() {
        return primaryServerId;
    }

    public String getInstanceName() {
        return instanceName;
    }

    public String getEnvironmentLabel() {
        return environmentLabel;
    }

    public UUID getCurrentReleaseId() {
        return currentReleaseId;
    }

    public DeploymentInstanceStatus getStatus() {
        return status;
    }

    public JsonNode getConfigOverride() {
        return configOverride;
    }

    public String getNotes() {
        return notes;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public static String buildActiveKey(UUID customerId, String instanceName) {
        return (customerId + ":" + instanceName.trim()).toLowerCase(Locale.ROOT);
    }
}
