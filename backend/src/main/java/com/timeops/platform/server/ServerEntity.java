package com.timeops.platform.server;

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
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "managed_server")
public class ServerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false, length = 255)
    private String host;

    @Column(name = "ssh_port", nullable = false)
    private Integer sshPort;

    @Column(name = "ssh_username", nullable = false, length = 100)
    private String sshUsername;

    @Column(name = "ssh_password_cipher", nullable = false, columnDefinition = "TEXT")
    private String sshPasswordCipher;

    @Column(name = "os_label", length = 100)
    private String osLabel;

    @Convert(converter = StringListJsonConverter.class)
    @Column(nullable = false, columnDefinition = "TEXT")
    private List<String> tags;

    @Enumerated(EnumType.STRING)
    @Column(name = "connectivity_status", nullable = false, length = 20)
    private ConnectivityStatus connectivityStatus;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private OffsetDateTime createdAt;

    protected ServerEntity() {
    }

    public ServerEntity(
            UUID customerId,
            String host,
            Integer sshPort,
            String sshUsername,
            String sshPasswordCipher,
            String osLabel,
            List<String> tags,
            ConnectivityStatus connectivityStatus,
            String notes) {
        this.customerId = customerId;
        this.host = host;
        this.sshPort = sshPort;
        this.sshUsername = sshUsername;
        this.sshPasswordCipher = sshPasswordCipher;
        this.osLabel = osLabel;
        this.tags = tags;
        this.connectivityStatus = connectivityStatus;
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public String getHost() {
        return host;
    }

    public Integer getSshPort() {
        return sshPort;
    }

    public String getSshUsername() {
        return sshUsername;
    }

    public String getSshPasswordCipher() {
        return sshPasswordCipher;
    }

    public String getOsLabel() {
        return osLabel;
    }

    public List<String> getTags() {
        return tags;
    }

    public ConnectivityStatus getConnectivityStatus() {
        return connectivityStatus;
    }

    public String getNotes() {
        return notes;
    }
}
