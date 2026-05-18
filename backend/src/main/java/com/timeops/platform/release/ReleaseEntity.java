package com.timeops.platform.release;

import com.timeops.platform.common.jpa.AbstractArchivableEntity;
import com.timeops.platform.template.ProductTemplateEntity;
import jakarta.persistence.Column;
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
import java.util.Locale;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "product_release")
public class ReleaseEntity extends AbstractArchivableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private ProductTemplateEntity template;

    @Column(name = "version_label", nullable = false, length = 100)
    private String versionLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ReleaseSourceType sourceType;

    @Column(name = "repository_url", length = 500)
    private String repositoryUrl;

    @Column(name = "git_ref", length = 255)
    private String gitRef;

    @Column(name = "package_uri", length = 500)
    private String packageUri;

    @Column(columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected ReleaseEntity() {
    }

    public ReleaseEntity(
            ProductTemplateEntity template,
            String versionLabel,
            ReleaseSourceType sourceType,
            String repositoryUrl,
            String gitRef,
            String packageUri,
            String changelog,
            UUID createdBy) {
        super(buildActiveKey(template.getId(), versionLabel));
        this.template = template;
        this.versionLabel = versionLabel;
        this.sourceType = sourceType;
        this.repositoryUrl = repositoryUrl;
        this.gitRef = gitRef;
        this.packageUri = packageUri;
        this.changelog = changelog;
        this.createdBy = createdBy;
    }

    public void update(
            ProductTemplateEntity template,
            String versionLabel,
            ReleaseSourceType sourceType,
            String repositoryUrl,
            String gitRef,
            String packageUri,
            String changelog) {
        this.template = template;
        this.versionLabel = versionLabel;
        this.sourceType = sourceType;
        this.repositoryUrl = repositoryUrl;
        this.gitRef = gitRef;
        this.packageUri = packageUri;
        this.changelog = changelog;
        refreshActiveKey(buildActiveKey(template.getId(), versionLabel));
    }

    public UUID getId() {
        return id;
    }

    public ProductTemplateEntity getTemplate() {
        return template;
    }

    public String getVersionLabel() {
        return versionLabel;
    }

    public ReleaseSourceType getSourceType() {
        return sourceType;
    }

    public String getRepositoryUrl() {
        return repositoryUrl;
    }

    public String getGitRef() {
        return gitRef;
    }

    public String getPackageUri() {
        return packageUri;
    }

    public String getChangelog() {
        return changelog;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public static String buildActiveKey(UUID templateId, String versionLabel) {
        return (templateId + ":" + versionLabel.trim()).toLowerCase(Locale.ROOT);
    }
}
