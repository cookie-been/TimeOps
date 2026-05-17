package com.timeops.platform.server.dto;

import java.util.UUID;

public record ServerResponse(
        UUID id,
        UUID customerId
) {
}
