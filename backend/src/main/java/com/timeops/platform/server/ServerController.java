package com.timeops.platform.server;

import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.server.dto.ServerCreateRequest;
import com.timeops.platform.server.dto.ServerResponse;
import com.timeops.platform.server.dto.ServerSummaryResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/servers")
public class ServerController {

    private final ServerService serverService;

    public ServerController(ServerService serverService) {
        this.serverService = serverService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ServerResponse> createServer(@Valid @RequestBody ServerCreateRequest serverCreateRequest) {
        return ApiResponse.ok(serverService.createServer(serverCreateRequest));
    }

    @GetMapping
    public ApiResponse<List<ServerSummaryResponse>> listServers() {
        return ApiResponse.ok(serverService.listServers());
    }
}
