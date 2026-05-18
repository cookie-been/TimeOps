package com.timeops.platform.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.common.jpa.JsonNodeTextConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "template_action")
public class TemplateActionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private ProductTemplateEntity template;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 30)
    private TemplateActionType actionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TemplateActionMode mode;

    @Column(name = "script_body", columnDefinition = "TEXT")
    private String scriptBody;

    @Convert(converter = JsonNodeTextConverter.class)
    @Column(name = "step_definition", columnDefinition = "TEXT")
    private JsonNode stepDefinition;

    @Column(name = "execution_order", nullable = false)
    private Integer executionOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected TemplateActionEntity() {
    }

    public TemplateActionEntity(
            TemplateActionType actionType,
            TemplateActionMode mode,
            String scriptBody,
            JsonNode stepDefinition) {
        this.actionType = actionType;
        this.mode = mode;
        this.scriptBody = scriptBody;
        this.stepDefinition = stepDefinition;
    }

    void attachToTemplate(ProductTemplateEntity template, int executionOrder) {
        this.template = template;
        this.executionOrder = executionOrder;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTemplateId() {
        return template == null ? null : template.getId();
    }

    public TemplateActionType getActionType() {
        return actionType;
    }

    public TemplateActionMode getMode() {
        return mode;
    }

    public String getScriptBody() {
        return scriptBody;
    }

    public JsonNode getStepDefinition() {
        return stepDefinition;
    }

    public Integer getExecutionOrder() {
        return executionOrder;
    }
}
