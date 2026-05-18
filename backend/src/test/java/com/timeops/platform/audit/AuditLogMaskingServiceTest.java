package com.timeops.platform.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AuditLogMaskingServiceTest {

    @Test
    void shouldMaskSensitiveKeyValuePairs() {
        AuditLogMaskingService auditLogMaskingService = new AuditLogMaskingService();

        String masked = auditLogMaskingService.mask("DB_PASSWORD=secret TOKEN=abc123");

        assertThat(masked).isEqualTo("DB_PASSWORD=****** TOKEN=******");
    }
}
