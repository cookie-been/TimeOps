package com.timeops.platform.server;

import com.timeops.platform.common.jpa.RecordStatus;
import com.timeops.platform.common.jpa.RecordStatusFilter;
import com.timeops.platform.customer.repository.CustomerRepository;
import com.timeops.platform.server.dto.ServerCreateRequest;
import com.timeops.platform.server.dto.ServerResponse;
import com.timeops.platform.server.dto.ServerSummaryResponse;
import com.timeops.platform.server.dto.ServerUpdateRequest;
import com.timeops.platform.server.repository.ServerRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;

@Service
public class ServerService {

    private static final String PASSWORD_MASK = "********";

    private final ServerRepository serverRepository;
    private final CustomerRepository customerRepository;
    private final CredentialCryptoService credentialCryptoService;
    private final DeploymentInstanceRepository deploymentInstanceRepository;

    public ServerService(
            ServerRepository serverRepository,
            CustomerRepository customerRepository,
            CredentialCryptoService credentialCryptoService,
            DeploymentInstanceRepository deploymentInstanceRepository) {
        this.serverRepository = serverRepository;
        this.customerRepository = customerRepository;
        this.credentialCryptoService = credentialCryptoService;
        this.deploymentInstanceRepository = deploymentInstanceRepository;
    }

    @Transactional
    public ServerResponse createServer(ServerCreateRequest serverCreateRequest) {
        if (!customerRepository.existsByIdAndRecordStatus(serverCreateRequest.customerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        ensureActiveKeyAvailable(ServerEntity.buildActiveKey(serverCreateRequest.host(), serverCreateRequest.sshPort()), null);

        ServerEntity serverEntity = new ServerEntity(
                serverCreateRequest.customerId(),
                serverCreateRequest.host(),
                serverCreateRequest.sshPort(),
                serverCreateRequest.sshUsername(),
                credentialCryptoService.encrypt(serverCreateRequest.sshPassword()),
                serverCreateRequest.osLabel(),
                serverCreateRequest.tags() == null ? List.of() : List.copyOf(serverCreateRequest.tags()),
                ConnectivityStatus.UNKNOWN,
                serverCreateRequest.notes()
        );
        ServerEntity savedServer = serverRepository.save(serverEntity);
        return toResponse(savedServer);
    }

    @Transactional(readOnly = true)
    public List<ServerSummaryResponse> listServers(RecordStatusFilter recordStatusFilter) {
        return loadServers(recordStatusFilter).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ServerSummaryResponse getServer(UUID serverId) {
        return toSummaryResponse(findServer(serverId));
    }

    @Transactional
    public ServerSummaryResponse updateServer(UUID serverId, ServerUpdateRequest serverUpdateRequest) {
        ServerEntity serverEntity = findServer(serverId);
        requireActive(serverEntity, "server is archived");
        if (!customerRepository.existsByIdAndRecordStatus(serverUpdateRequest.customerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        String activeKey = ServerEntity.buildActiveKey(serverUpdateRequest.host(), serverUpdateRequest.sshPort());
        ensureActiveKeyAvailable(activeKey, serverEntity.getActiveKey());
        String sshPasswordCipher = serverUpdateRequest.sshPassword() == null || serverUpdateRequest.sshPassword().isBlank()
                ? serverEntity.getSshPasswordCipher()
                : credentialCryptoService.encrypt(serverUpdateRequest.sshPassword());
        serverEntity.update(
                serverUpdateRequest.customerId(),
                serverUpdateRequest.host(),
                serverUpdateRequest.sshPort(),
                serverUpdateRequest.sshUsername(),
                sshPasswordCipher,
                serverUpdateRequest.osLabel(),
                serverUpdateRequest.tags() == null ? List.of() : List.copyOf(serverUpdateRequest.tags()),
                serverUpdateRequest.notes());
        return toSummaryResponse(serverEntity);
    }

    @Transactional
    public ServerSummaryResponse archiveServer(UUID serverId, UUID actorUserId) {
        ServerEntity serverEntity = findServer(serverId);
        requireActive(serverEntity, "server is already archived");
        if (deploymentInstanceRepository.existsByPrimaryServerIdAndRecordStatus(serverId, RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "server has active instances");
        }
        serverEntity.archive(actorUserId);
        return toSummaryResponse(serverEntity);
    }

    @Transactional
    public ServerSummaryResponse restoreServer(UUID serverId) {
        ServerEntity serverEntity = findServer(serverId);
        if (serverEntity.getRecordStatus() == RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "server is already active");
        }
        if (!customerRepository.existsByIdAndRecordStatus(serverEntity.getCustomerId(), RecordStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }
        String activeKey = ServerEntity.buildActiveKey(serverEntity.getHost(), serverEntity.getSshPort());
        ensureActiveKeyAvailable(activeKey, null);
        serverEntity.restore(activeKey);
        return toSummaryResponse(serverEntity);
    }

    private List<ServerEntity> loadServers(RecordStatusFilter recordStatusFilter) {
        return switch (recordStatusFilter) {
            case ALL -> serverRepository.findAllByOrderByCreatedAtDesc();
            case ACTIVE -> serverRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ACTIVE);
            case ARCHIVED -> serverRepository.findAllByRecordStatusOrderByCreatedAtDesc(RecordStatus.ARCHIVED);
        };
    }

    private ServerEntity findServer(UUID serverId) {
        return serverRepository.findById(serverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "server does not exist"));
    }

    private void ensureActiveKeyAvailable(String activeKey, String currentActiveKey) {
        if (activeKey.equals(currentActiveKey)) {
            return;
        }
        if (serverRepository.existsByActiveKey(activeKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "server host already exists");
        }
    }

    private void requireActive(ServerEntity serverEntity, String message) {
        if (serverEntity.getRecordStatus() != RecordStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private ServerResponse toResponse(ServerEntity serverEntity) {
        return new ServerResponse(
                serverEntity.getId(),
                serverEntity.getCustomerId(),
                serverEntity.getHost(),
                serverEntity.getSshPort(),
                serverEntity.getSshUsername(),
                PASSWORD_MASK,
                serverEntity.getOsLabel(),
                serverEntity.getConnectivityStatus().name(),
                serverEntity.getNotes(),
                serverEntity.getRecordStatus().name(),
                serverEntity.getArchivedAt());
    }

    private ServerSummaryResponse toSummaryResponse(ServerEntity serverEntity) {
        return new ServerSummaryResponse(
                serverEntity.getId(),
                serverEntity.getCustomerId(),
                serverEntity.getHost(),
                serverEntity.getSshPort(),
                serverEntity.getSshUsername(),
                PASSWORD_MASK,
                serverEntity.getOsLabel(),
                serverEntity.getTags(),
                serverEntity.getConnectivityStatus().name(),
                serverEntity.getNotes(),
                serverEntity.getRecordStatus().name(),
                serverEntity.getArchivedAt());
    }
}
