package com.timeops.platform.user.dto;

import java.util.List;
import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String username,
        String displayName,
        List<String> roles,
        boolean enabled
) {
}
