package com.timeops.platform.server;

import com.timeops.platform.customer.repository.CustomerRepository;
import com.timeops.platform.server.dto.ServerCreateRequest;
import com.timeops.platform.server.dto.ServerResponse;
import com.timeops.platform.server.dto.ServerSummaryResponse;
import com.timeops.platform.server.repository.ServerRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class ServerService {

    private static final String PASSWORD_MASK = "********";

    private final ServerRepository serverRepository;
    private final CustomerRepository customerRepository;
    private final CredentialCryptoService credentialCryptoService;

    public ServerService(
            ServerRepository serverRepository,
            CustomerRepository customerRepository,
            CredentialCryptoService credentialCryptoService) {
        this.serverRepository = serverRepository;
        this.customerRepository = customerRepository;
        this.credentialCryptoService = credentialCryptoService;
    }

    @Transactional
    public ServerResponse createServer(ServerCreateRequest serverCreateRequest) {
        if (!customerRepository.existsById(serverCreateRequest.customerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "customer does not exist");
        }

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
        return new ServerResponse(savedServer.getId(), savedServer.getCustomerId());
    }

    @Transactional(readOnly = true)
    public List<ServerSummaryResponse> listServers() {
        return serverRepository.findAll().stream()
                .map(serverEntity -> new ServerSummaryResponse(
                        serverEntity.getId(),
                        serverEntity.getCustomerId(),
                        serverEntity.getHost(),
                        serverEntity.getSshPort(),
                        serverEntity.getSshUsername(),
                        PASSWORD_MASK,
                        serverEntity.getOsLabel(),
                        serverEntity.getTags(),
                        serverEntity.getConnectivityStatus().name(),
                        serverEntity.getNotes()
                ))
                .toList();
    }
}
