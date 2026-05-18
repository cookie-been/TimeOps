package com.timeops.platform.common.jpa;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.MappedSuperclass;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.UpdateTimestamp;

@MappedSuperclass
public abstract class AbstractArchivableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "record_status", nullable = false, length = 20)
    private RecordStatus recordStatus = RecordStatus.ACTIVE;

    @Column(name = "active_key", length = 500)
    private String activeKey;

    @Column(name = "archived_at")
    private OffsetDateTime archivedAt;

    @Column(name = "archived_by")
    private UUID archivedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AbstractArchivableEntity() {
    }

    protected AbstractArchivableEntity(String activeKey) {
        this.activeKey = activeKey;
        this.recordStatus = RecordStatus.ACTIVE;
    }

    protected void refreshActiveKey(String activeKey) {
        if (recordStatus == RecordStatus.ACTIVE) {
            this.activeKey = activeKey;
        }
    }

    public void archive(UUID actorUserId) {
        this.recordStatus = RecordStatus.ARCHIVED;
        this.activeKey = null;
        this.archivedAt = OffsetDateTime.now();
        this.archivedBy = actorUserId;
    }

    public void restore(String activeKey) {
        this.recordStatus = RecordStatus.ACTIVE;
        this.activeKey = activeKey;
        this.archivedAt = null;
        this.archivedBy = null;
    }

    public RecordStatus getRecordStatus() {
        return recordStatus;
    }

    public String getActiveKey() {
        return activeKey;
    }

    public OffsetDateTime getArchivedAt() {
        return archivedAt;
    }

    public UUID getArchivedBy() {
        return archivedBy;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
