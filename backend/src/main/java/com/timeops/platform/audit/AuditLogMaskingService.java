package com.timeops.platform.audit;

import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class AuditLogMaskingService {

    private static final Pattern SENSITIVE_KV_PATTERN = Pattern.compile(
            "(?i)([A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN)[A-Z0-9_]*)=([^\\s]+)");

    public String mask(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        return SENSITIVE_KV_PATTERN.matcher(text).replaceAll("$1=******");
    }
}
