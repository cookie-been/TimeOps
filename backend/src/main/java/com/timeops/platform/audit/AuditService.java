package com.timeops.platform.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMaskingService auditLogMaskingService;
    private final ObjectMapper objectMapper;

    public AuditService(
            AuditLogRepository auditLogRepository,
            AuditLogMaskingService auditLogMaskingService,
            ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.auditLogMaskingService = auditLogMaskingService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void record(
            UUID actorUserId,
            String actionType,
            String targetType,
            String targetId,
            UUID taskId,
            Map<String, Object> detail) {
        ObjectNode detailNode = detail == null ? objectMapper.createObjectNode() : objectMapper.valueToTree(detail);
        detailNode.fields().forEachRemaining(entry -> {
            if (entry.getValue().isTextual()) {
                detailNode.put(entry.getKey(), auditLogMaskingService.mask(entry.getValue().asText()));
            }
        });
        auditLogRepository.save(new AuditLogEntity(
                actorUserId,
                actionType,
                targetType,
                targetId,
                taskId,
                detailNode));
    }

    @Transactional(readOnly = true)
    public List<AuditLogEntity> listAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
