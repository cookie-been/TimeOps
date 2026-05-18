package com.timeops.platform.audit;

import com.timeops.platform.audit.dto.AuditLogResponse;
import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditService auditService;
    private final UserRepository userRepository;

    public AuditLogController(AuditService auditService, UserRepository userRepository) {
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ApiResponse<List<AuditLogResponse>> listAuditLogs() {
        Map<UUID, String> actorNameMap = userRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(
                        userEntity -> userEntity.getId(),
                        userEntity -> userEntity.getDisplayName()));
        return ApiResponse.ok(auditService.listAuditLogs().stream()
                .map(auditLogEntity -> new AuditLogResponse(
                        auditLogEntity.getId(),
                        auditLogEntity.getActorUserId(),
                        actorNameMap.get(auditLogEntity.getActorUserId()),
                        auditLogEntity.getActionType(),
                        auditLogEntity.getTargetType(),
                        auditLogEntity.getTargetId(),
                        auditLogEntity.getTaskId(),
                        auditLogEntity.getDetail(),
                        auditLogEntity.getCreatedAt()
                ))
                .toList());
    }
}
