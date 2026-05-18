package com.timeops.platform.template;

import com.fasterxml.jackson.databind.JsonNode;
import com.timeops.platform.common.jpa.AbstractArchivableEntity;
import com.timeops.platform.common.jpa.JsonNodeTextConverter;
import com.timeops.platform.server.StringListJsonConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "product_template")
public class ProductTemplateEntity extends AbstractArchivableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "product_code", nullable = false, length = 100)
    private String productCode;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "supported_release_sources", nullable = false, columnDefinition = "TEXT")
    private List<String> supportedReleaseSources;

    @Column(name = "default_work_dir", length = 255)
    private String defaultWorkDir;

    @Convert(converter = JsonNodeTextConverter.class)
    @Column(name = "default_config", nullable = false, columnDefinition = "TEXT")
    private JsonNode defaultConfig;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("executionOrder ASC")
    private List<TemplateActionEntity> actions = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected ProductTemplateEntity() {
    }

    public ProductTemplateEntity(
            String name,
            String productCode,
            List<String> supportedReleaseSources,
            String defaultWorkDir,
            JsonNode defaultConfig,
            String description) {
        super(buildActiveKey(productCode));
        this.name = name;
        this.productCode = productCode;
        this.supportedReleaseSources = supportedReleaseSources;
        this.defaultWorkDir = defaultWorkDir;
        this.defaultConfig = defaultConfig;
        this.description = description;
    }

    public void update(
            String name,
            String productCode,
            List<String> supportedReleaseSources,
            String defaultWorkDir,
            JsonNode defaultConfig,
            String description) {
        this.name = name;
        this.productCode = productCode;
        this.supportedReleaseSources = supportedReleaseSources;
        this.defaultWorkDir = defaultWorkDir;
        this.defaultConfig = defaultConfig;
        this.description = description;
        refreshActiveKey(buildActiveKey(productCode));
    }

    public void addAction(TemplateActionEntity action) {
        action.attachToTemplate(this, actions.size() + 1);
        actions.add(action);
    }

    public void replaceActions(List<TemplateActionEntity> replacementActions) {
        actions.clear();
        replacementActions.forEach(this::addAction);
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getProductCode() {
        return productCode;
    }

    public List<String> getSupportedReleaseSources() {
        return supportedReleaseSources;
    }

    public String getDefaultWorkDir() {
        return defaultWorkDir;
    }

    public JsonNode getDefaultConfig() {
        return defaultConfig;
    }

    public String getDescription() {
        return description;
    }

    public List<TemplateActionEntity> getActions() {
        return List.copyOf(actions);
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public static String buildActiveKey(String productCode) {
        return productCode.trim().toLowerCase(Locale.ROOT);
    }
}
